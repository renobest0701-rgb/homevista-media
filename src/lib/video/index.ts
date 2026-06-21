import type { VideoProcessor } from "./processor";
import { MockVideoProcessor } from "./mock";

let _processor: VideoProcessor | null = null;

export function getVideoProcessor(): VideoProcessor {
  if (_processor) return _processor;

  const provider = process.env.VIDEO_PROCESSOR ?? "mock";
  if (provider === "ffmpeg") {
    // Dynamically import FFmpeg processor to avoid import errors in mock mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FFmpegProcessor } = require("./ffmpeg");
    _processor = new FFmpegProcessor() as VideoProcessor;
  } else {
    _processor = new MockVideoProcessor();
  }
  return _processor!;
}

export type { VideoProcessor, VideoMetadata, ImageMetadata } from "./processor";
