import type { StorageProvider, PresignedUrlOptions, UploadUrlResult } from "./provider";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH ?? "./uploads";
    this.baseUrl = process.env.LOCAL_STORAGE_URL ?? "http://localhost:3000/uploads";
  }

  generateObjectKey(params: {
    projectId: string;
    assetId: string;
    fileRole: string;
    originalFileName: string;
  }): string {
    const ext = path.extname(params.originalFileName);
    return `${params.projectId}/${params.assetId}/${params.fileRole}${ext}`;
  }

  async getUploadUrl(
    objectKey: string,
    _options?: PresignedUrlOptions
  ): Promise<UploadUrlResult> {
    // Local: return an API route that accepts the file
    return {
      uploadUrl: `/api/uploads/local?key=${encodeURIComponent(objectKey)}`,
      objectKey,
    };
  }

  async getDownloadUrl(
    objectKey: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    // Local: generate a token-protected URL
    const token = crypto
      .createHmac("sha256", process.env.JWT_SECRET ?? "dev-secret")
      .update(`${objectKey}:${Math.floor(Date.now() / 1000 / expiresInSeconds)}`)
      .digest("hex");
    return `${this.baseUrl}/${objectKey}?token=${token}`;
  }

  async delete(objectKey: string): Promise<void> {
    const fullPath = path.join(this.basePath, objectKey);
    await fs.rm(fullPath, { force: true });
  }

  async exists(objectKey: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, objectKey);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
