import type { Logger } from 'pino'

import type { IStorageRepository } from '../repositories/storage.repository.js'
import type { IStorageUrlService, StorageBucketType } from '../types/storage.js'

interface ICachedSignedUrl {
  refreshAt: number
  url: string | null
}

const MAX_CACHE_ENTRIES = 2_000

export class StorageService implements IStorageUrlService {
  private readonly cache = new Map<string, ICachedSignedUrl>()

  public constructor(
    private readonly repository: IStorageRepository,
    private readonly expiresInSeconds: number,
    private readonly refreshSkewSeconds: number,
    private readonly logger: Logger,
  ) {}

  public async resolveSignedUrls(
    bucket: StorageBucketType,
    paths: readonly string[],
  ): Promise<ReadonlyMap<string, string | null>> {
    const uniquePaths = [...new Set(paths)]
    const now = Date.now()
    const resolvedUrls = new Map<string, string | null>()
    const pathsToRefresh: string[] = []

    for (const path of uniquePaths) {
      const cached = this.cache.get(this.getCacheKey(bucket, path))

      if (cached !== undefined && cached.refreshAt > now) {
        resolvedUrls.set(path, cached.url)
      } else {
        pathsToRefresh.push(path)
      }
    }

    if (pathsToRefresh.length > 0) {
      const refreshedUrls = await this.repository.createSignedUrls(
        bucket,
        pathsToRefresh,
        this.expiresInSeconds,
      )
      const successfulRefreshAt =
        now + (this.expiresInSeconds - this.refreshSkewSeconds) * 1_000
      const failedRefreshAt = now + 60_000
      let failedCount = 0

      for (const path of pathsToRefresh) {
        const url = refreshedUrls.get(path) ?? null

        if (url === null) {
          failedCount += 1
        }

        resolvedUrls.set(path, url)
        this.cache.set(this.getCacheKey(bucket, path), {
          refreshAt: url === null ? failedRefreshAt : successfulRefreshAt,
          url,
        })
      }

      if (failedCount > 0) {
        this.logger.warn(
          { bucket, failedCount, requestedCount: pathsToRefresh.length },
          'No fue posible resolver algunas imágenes privadas',
        )
      }
    }

    this.pruneExpiredEntries(now)

    return resolvedUrls
  }

  public async upload(
    bucket: StorageBucketType,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.repository.upload(bucket, path, file, contentType)
    this.cache.delete(this.getCacheKey(bucket, path))
  }

  public async remove(bucket: StorageBucketType, paths: readonly string[]): Promise<void> {
    await this.repository.remove(bucket, paths)

    for (const path of paths) {
      this.cache.delete(this.getCacheKey(bucket, path))
    }
  }

  private getCacheKey(bucket: StorageBucketType, path: string): string {
    return `${bucket}:${path}`
  }

  private pruneExpiredEntries(now: number): void {
    if (this.cache.size <= MAX_CACHE_ENTRIES) {
      return
    }

    for (const [key, entry] of this.cache) {
      if (entry.refreshAt <= now) {
        this.cache.delete(key)
      }
    }
  }
}
