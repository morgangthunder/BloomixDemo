import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

@Injectable()
export class MediaMetadataService {
  private readonly logger = new Logger(MediaMetadataService.name);
  private readonly maxDurationVideo = 60 * 60; // 60 minutes in seconds
  private readonly maxDurationAudio = 120 * 60; // 120 minutes in seconds

  /**
   * Extract metadata from media file
   * Uses ffprobe if available, otherwise returns basic metadata
   */
  async extractMetadata(filePath: string, mediaType: 'video' | 'audio'): Promise<{
    duration?: number;
    fileSize: number;
    codec?: string;
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    sampleRate?: number;
    channels?: number;
  }> {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // Try to use ffprobe for detailed metadata
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      const probeData = JSON.parse(stdout);

      const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');
      const format = probeData.format;

      const duration = format?.duration ? parseFloat(format.duration) : undefined;
      
      // Validate duration limits
      if (duration) {
        const maxDuration = mediaType === 'video' ? this.maxDurationVideo : this.maxDurationAudio;
        if (duration > maxDuration) {
          throw new Error(
            `Media duration (${Math.round(duration / 60)} minutes) exceeds maximum limit ` +
            `(${Math.round(maxDuration / 60)} minutes)`
          );
        }
      }

      const metadata: any = {
        duration,
        fileSize,
      };

      if (videoStream) {
        metadata.codec = videoStream.codec_name;
        metadata.width = videoStream.width;
        metadata.height = videoStream.height;
        metadata.bitrate = format?.bit_rate ? parseInt(format.bit_rate) : undefined;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          metadata.fps = den ? num / den : undefined;
        }
      }

      if (audioStream) {
        metadata.sampleRate = audioStream.sample_rate ? parseInt(audioStream.sample_rate) : undefined;
        metadata.channels = audioStream.channels;
        if (!metadata.codec) {
          metadata.codec = audioStream.codec_name;
        }
        if (!metadata.bitrate && format?.bit_rate) {
          metadata.bitrate = parseInt(format.bit_rate);
        }
      }

      this.logger.log(`Extracted metadata for ${mediaType}: duration=${duration}s, size=${fileSize} bytes`);
      return metadata;
    } catch (error: any) {
      // ffprobe not available or failed - return basic metadata
      this.logger.warn(`ffprobe not available or failed: ${error.message}. Using basic metadata.`);
      return {
        fileSize,
        // Duration and other metadata will be undefined
      };
    }
  }

  /**
   * Check if ffprobe is available
   */
  async isFfprobeAvailable(): Promise<boolean> {
    try {
      await execAsync('ffprobe -version');
      return true;
    } catch {
      return false;
    }
  }
}

