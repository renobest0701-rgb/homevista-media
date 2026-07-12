import type { StorageProvider, PresignedUrlOptions, UploadUrlResult } from "./provider";
import path from "path";
import crypto from "crypto";

export class OSSStorageProvider implements StorageProvider {
  private region: string;
  private bucket: string;
  private accessKeyId: string;
  private accessKeySecret: string;
  private cdnDomain: string;

  constructor() {
    this.region = process.env.OSS_REGION ?? "";
    this.bucket = process.env.OSS_BUCKET_NAME ?? "";
    this.accessKeyId = process.env.OSS_ACCESS_KEY_ID ?? "";
    this.accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET ?? "";
    this.cdnDomain = process.env.OSS_CDN_DOMAIN ?? "";
  }

  generateObjectKey(params: {
    projectId: string;
    assetId: string;
    fileRole: string;
    originalFileName: string;
  }): string {
    const ext = path.extname(params.originalFileName);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `assets/${date}/${params.projectId}/${params.assetId}/${params.fileRole}${ext}`;
  }

  async getUploadUrl(
    objectKey: string,
    options?: PresignedUrlOptions
  ): Promise<UploadUrlResult> {
    // Alibaba Cloud OSS POST policy for direct browser upload
    const expiration = new Date(
      Date.now() + (options?.expiresInSeconds ?? 3600) * 1000
    ).toISOString();

    const policy = {
      expiration,
      conditions: [
        ["content-length-range", 0, options?.maxSizeBytes ?? 10 * 1024 * 1024 * 1024],
        ["starts-with", "$key", objectKey],
      ],
    };

    const policyB64 = Buffer.from(JSON.stringify(policy)).toString("base64");
    const signature = crypto
      .createHmac("sha1", this.accessKeySecret)
      .update(policyB64)
      .digest("base64");

    const uploadUrl = `https://${this.bucket}.${this.region}.aliyuncs.com`;

    return {
      uploadUrl,
      objectKey,
      fields: {
        OSSAccessKeyId: this.accessKeyId,
        policy: policyB64,
        Signature: signature,
        key: objectKey,
        "Content-Type": options?.contentType ?? "application/octet-stream",
        success_action_status: "200",
      },
    };
  }

  async getDownloadUrl(
    objectKey: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const expireTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const baseUrl = this.cdnDomain
      ? `https://${this.cdnDomain}`
      : `https://${this.bucket}.${this.region}.aliyuncs.com`;

    const stringToSign = `GET\n\n\n${expireTime}\n/${this.bucket}/${objectKey}`;
    const signature = crypto
      .createHmac("sha1", this.accessKeySecret)
      .update(stringToSign)
      .digest("base64");

    const params = new URLSearchParams({
      OSSAccessKeyId: this.accessKeyId,
      Expires: String(expireTime),
      Signature: signature,
    });

    return `${baseUrl}/${objectKey}?${params.toString()}`;
  }

  async delete(objectKey: string): Promise<void> {
    // OSS DELETE via REST API
    const endpoint = `https://${this.bucket}.${this.region}.aliyuncs.com/${objectKey}`;
    const date = new Date().toUTCString();
    const stringToSign = `DELETE\n\n\n${date}\n/${this.bucket}/${objectKey}`;
    const signature = crypto
      .createHmac("sha1", this.accessKeySecret)
      .update(stringToSign)
      .digest("base64");

    await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Date: date,
        Authorization: `OSS ${this.accessKeyId}:${signature}`,
      },
    });
  }

  async exists(objectKey: string): Promise<boolean> {
    const url = await this.getDownloadUrl(objectKey, 60);
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  }
}
