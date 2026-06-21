export type StorageUploadOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
};

export type PresignedUrlOptions = {
  expiresInSeconds?: number;
  contentType?: string;
  maxSizeBytes?: number;
};

export type UploadUrlResult = {
  uploadUrl: string;
  objectKey: string;
  fields?: Record<string, string>; // for POST form uploads
};

export interface StorageProvider {
  /** Generate a presigned URL for direct browser upload */
  getUploadUrl(
    objectKey: string,
    options?: PresignedUrlOptions
  ): Promise<UploadUrlResult>;

  /** Generate a presigned URL for download (short-lived) */
  getDownloadUrl(
    objectKey: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /** Delete an object */
  delete(objectKey: string): Promise<void>;

  /** Check if an object exists */
  exists(objectKey: string): Promise<boolean>;

  /** Generate object key for a new asset file */
  generateObjectKey(params: {
    projectId: string;
    assetId: string;
    fileRole: string;
    originalFileName: string;
  }): string;
}
