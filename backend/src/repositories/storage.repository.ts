import type { ServerSupabaseClient } from '../config/supabase.js'
import type { StorageBucketType } from '../types/storage.js'

export interface IStorageRepository {
  createSignedUrls(
    bucket: StorageBucketType,
    paths: readonly string[],
    expiresInSeconds: number,
  ): Promise<ReadonlyMap<string, string | null>>
  remove(bucket: StorageBucketType, paths: readonly string[]): Promise<void>
  upload(
    bucket: StorageBucketType,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<void>
}

export class StorageRepository implements IStorageRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async createSignedUrls(
    bucket: StorageBucketType,
    paths: readonly string[],
    expiresInSeconds: number,
  ): Promise<ReadonlyMap<string, string | null>> {
    if (paths.length === 0) {
      return new Map()
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrls([...paths], expiresInSeconds)

    if (error !== null || data === null) {
      return new Map(paths.map((path) => [path, null]))
    }

    const urls = new Map<string, string | null>()

    for (const item of data) {
      if (item.path !== null) {
        urls.set(item.path, item.error === null ? item.signedUrl : null)
      }
    }

    for (const path of paths) {
      if (!urls.has(path)) {
        urls.set(path, null)
      }
    }

    return urls
  }

  public async upload(
    bucket: StorageBucketType,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.client.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    })

    if (error !== null) {
      throw new Error('Storage upload failed', { cause: error })
    }
  }

  public async remove(bucket: StorageBucketType, paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return

    const { error } = await this.client.storage.from(bucket).remove([...paths])

    if (error !== null) {
      throw new Error('Storage removal failed', { cause: error })
    }
  }
}
