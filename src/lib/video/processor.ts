export type VideoMetadata = {
  durationSeconds: number;
  width: number;
  height: number;
  frameRate: number;
  hasAudio: boolean;
  bitrate?: number;
  codec?: string;
  orientation?: string;
  createdAt?: Date;
  gpsLatitude?: number;
  gpsLongitude?: number;
};

export type ImageMetadata = {
  width: number;
  height: number;
  orientation?: string;
  createdAt?: Date;
  gpsLatitude?: number;
  gpsLongitude?: number;
};

export interface VideoProcessor {
  extractVideoMetadata(filePath: string): Promise<VideoMetadata>;
  extractImageMetadata(filePath: string): Promise<ImageMetadata>;
  generateThumbnail(
    filePath: string,
    outputPath: string,
    timeSeconds?: number
  ): Promise<void>;
  generatePreview(
    filePath: string,
    outputPath: string,
    options?: { maxDurationSeconds?: number; maxSizeBytes?: number }
  ): Promise<void>;
  calculateChecksum(filePath: string): Promise<string>;
}
