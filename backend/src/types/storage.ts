export type StorageBucketType = 'categories' | 'products' | 'settings'

export interface IStorageUrlService {
  resolveSignedUrls(
    bucket: StorageBucketType,
    paths: readonly string[],
  ): Promise<ReadonlyMap<string, string | null>>
}

export interface IStorageMutationService extends IStorageUrlService {
  remove(bucket: StorageBucketType, paths: readonly string[]): Promise<void>
  upload(
    bucket: StorageBucketType,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<void>
}
