import type { VideoProcessor, VideoMetadata, ImageMetadata } from "./processor";
import crypto from "crypto";
import fs from "fs/promises";

/**
 * Mock video processor for development/CI environments without FFmpeg.
 * Returns plausible metadata without actually processing files.
 */
export class MockVideoProcessor implements VideoProcessor {
  async extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
    console.warn(`[MockVideoProcessor] Returning mock metadata for: ${filePath}`);
    return {
      durationSeconds: 30,
      width: 3840,
      height: 2160,
      frameRate: 29.97,
      hasAudio: true,
      bitrate: 50000000,
      codec: "h264",
      orientation: "landscape",
    };
  }

  async extractImageMetadata(filePath: string): Promise<ImageMetadata> {
    console.warn(`[MockVideoProcessor] Returning mock image metadata for: ${filePath}`);
    return {
      width: 4000,
      height: 3000,
      orientation: "landscape",
    };
  }

  async generateThumbnail(
    filePath: string,
    outputPath: string,
    _timeSeconds = 5
  ): Promise<void> {
    console.warn(`[MockVideoProcessor] Skipping thumbnail for: ${filePath} → ${outputPath}`);
    // Write a 1x1 transparent PNG as placeholder
    const placeholder = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    try {
      const dir = outputPath.substring(0, outputPath.lastIndexOf("/"));
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(outputPath, placeholder);
    } catch {
      // Ignore in mock mode
    }
  }

  async generatePreview(
    filePath: string,
    outputPath: string
  ): Promise<void> {
    console.warn(`[MockVideoProcessor] Skipping preview generation: ${filePath} → ${outputPath}`);
  }

  async calculateChecksum(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch {
      return crypto.randomBytes(32).toString("hex");
    }
  }
}
