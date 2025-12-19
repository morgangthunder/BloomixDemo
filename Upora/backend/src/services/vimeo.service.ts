import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface VimeoVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number; // in seconds
  channel: string;
  transcript: string;
  startTime?: number;
  endTime?: number;
}

@Injectable()
export class VimeoService {
  private readonly logger = new Logger(VimeoService.name);
  private readonly API_TOKEN = process.env.VIMEO_API_TOKEN; // Optional, for private videos

  /**
   * Extract video ID from Vimeo URL
   */
  private extractVideoId(url: string): string {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new BadRequestException('Invalid Vimeo URL');
  }

  /**
   * Process Vimeo URL and fetch video data
   */
  async processVimeoUrl(url: string, startTime?: number, endTime?: number): Promise<VimeoVideoData> {
    const videoId = this.extractVideoId(url);
    this.logger.log(`Processing Vimeo video: ${videoId}`);

    try {
      // Fetch video metadata using oEmbed API (no auth required for public videos)
      const metadata = await this.fetchVideoMetadata(videoId, url);
      
      // Try to fetch transcript (Vimeo doesn't have a built-in transcript API like YouTube)
      // For now, we'll return an empty transcript - this can be enhanced later with third-party services
      let transcript = '';
      try {
        // Vimeo doesn't provide transcripts via API, so we'll leave this empty
        // In the future, we could integrate with third-party transcription services
        transcript = 'Transcript not available for this video.';
      } catch (error) {
        this.logger.warn(`Could not fetch transcript for ${videoId}: ${error.message}`);
        transcript = 'Transcript not available for this video.';
      }

      return {
        videoId,
        title: metadata.title,
        description: metadata.description || '',
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        channel: metadata.channel || 'Vimeo',
        transcript,
        startTime,
        endTime,
      };
    } catch (error) {
      this.logger.error(`Failed to process Vimeo URL: ${error.message}`);
      throw new BadRequestException(`Failed to process Vimeo video: ${error.message}`);
    }
  }

  /**
   * Fetch video metadata from Vimeo oEmbed API
   */
  private async fetchVideoMetadata(videoId: string, url: string) {
    try {
      // Use oEmbed API for public videos (no auth required)
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
      const oembedResponse = await axios.get(oembedUrl);

      const oembed = oembedResponse.data;

      // If we have an API token, we can get more detailed info
      let duration = 0;
      let channel = oembed.author_name || 'Vimeo';
      
      if (this.API_TOKEN) {
        try {
          // Use Vimeo API v3 for more detailed metadata
          const apiResponse = await axios.get(`https://api.vimeo.com/videos/${videoId}`, {
            headers: {
              'Authorization': `Bearer ${this.API_TOKEN}`,
            },
          });

          duration = apiResponse.data.duration || 0;
          channel = apiResponse.data.user?.name || oembed.author_name || 'Vimeo';
        } catch (apiError) {
          this.logger.warn(`Vimeo API call failed, using oEmbed data: ${apiError.message}`);
          // Fall back to oEmbed if API fails
          duration = 0; // oEmbed doesn't provide duration
        }
      } else {
        // Without API token, we can't get duration from Vimeo API
        // We'll need to extract it from the video player or use a workaround
        this.logger.warn('Vimeo API token not configured. Duration may not be available.');
      }

      return {
        title: oembed.title || 'Untitled Video',
        description: oembed.description || '',
        thumbnail: oembed.thumbnail_url || '',
        duration: duration,
        channel: channel,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new BadRequestException('Video not found or is private');
      }
      throw new BadRequestException(`Failed to fetch Vimeo video metadata: ${error.message}`);
    }
  }
}



