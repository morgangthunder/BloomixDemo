import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channel: string;
  transcript: string;
  startTime?: number;
  endTime?: number;
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);
  private readonly API_KEY = process.env.YOUTUBE_API_KEY;

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new BadRequestException('Invalid YouTube URL');
  }

  /**
   * Process YouTube URL and fetch video data
   */
  async processYouTubeUrl(url: string, startTime?: number, endTime?: number): Promise<YouTubeVideoData> {
    if (!this.API_KEY) {
      throw new BadRequestException('YouTube API key not configured');
    }

    const videoId = this.extractVideoId(url);
    this.logger.log(`Processing YouTube video: ${videoId}`);

    try {
      // Fetch video metadata
      const metadata = await this.fetchVideoMetadata(videoId);
      
      // Try to fetch transcript
      let transcript = '';
      try {
        transcript = await this.fetchTranscript(videoId);
      } catch (error) {
        this.logger.warn(`Could not fetch transcript for ${videoId}: ${error.message}`);
        transcript = 'Transcript not available for this video.';
      }

      return {
        videoId,
        title: metadata.title,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        channel: metadata.channel,
        transcript,
        startTime,
        endTime,
      };
    } catch (error) {
      this.logger.error(`Failed to process YouTube URL: ${error.message}`);
      throw new BadRequestException(`Failed to process YouTube video: ${error.message}`);
    }
  }

  /**
   * Fetch video metadata from YouTube Data API v3
   */
  private async fetchVideoMetadata(videoId: string) {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        id: videoId,
        part: 'snippet,contentDetails',
        key: this.API_KEY,
      },
    });

    if (response.data.items.length === 0) {
      throw new BadRequestException('Video not found');
    }

    const item = response.data.items[0];
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;

    return {
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails.high.url,
      duration: contentDetails.duration,
      channel: snippet.channelTitle,
    };
  }

  /**
   * Fetch transcript from YouTube using @distube/ytdl-core
   */
  private async fetchTranscript(videoId: string): Promise<string> {
    try {
      this.logger.log(`Attempting to fetch transcript for video: ${videoId}`);
      
      const info = await ytdl.getInfo(videoId);
      
      // Check for caption tracks - the structure might vary
      const playerResponse: any = info.player_response || {};
      const captions = playerResponse.captions;
      
      let captionTracks: any[] = [];
      
      // Try different possible caption structures
      if (captions?.playerCaptionsTracklistRenderer?.captionTracks) {
        captionTracks = captions.playerCaptionsTracklistRenderer.captionTracks;
      } else if (captions?.playerCaptionsRenderer?.captionTracks) {
        captionTracks = captions.playerCaptionsRenderer.captionTracks;
      } else if (captions?.tracklistRenderer?.tracks) {
        captionTracks = captions.tracklistRenderer.tracks;
      }
      
      if (!captionTracks || captionTracks.length === 0) {
        this.logger.log(`No caption tracks found for video: ${videoId}`);
        return 'No transcript available for this video.';
      }
      
      this.logger.log(`Found ${captionTracks.length} caption tracks`);
      
      // Get the base URL for the first English track (or first available)
      const enTrack = captionTracks.find((track: any) => track.languageCode?.startsWith('en')) || captionTracks[0];
      const captionUrl = enTrack.baseUrl;
      
      this.logger.log(`Fetching transcript from URL for language: ${enTrack.languageCode}`);
      
      // Fetch the transcript XML
      const transcriptResponse = await axios.get(captionUrl);
      
      // Extract text from XML
      const transcriptText = this.extractTextFromXML(transcriptResponse.data);
      
      this.logger.log(`Transcript text length: ${transcriptText.length}`);
      
      if (!transcriptText || transcriptText.length === 0) {
        throw new Error('No transcript content found');
      }
      
      return transcriptText;
      
    } catch (error: any) {
      this.logger.warn(`Failed to fetch transcript: ${error.message}`);
      return 'No transcript available for this video.';
    }
  }

  /**
   * Extract text from YouTube's timedtext XML response
   */
  private extractTextFromXML(xml: string): string {
    // Extract text content from <text> tags
    const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g);
    if (textMatches) {
      return textMatches
        .map(match => match.replace(/<text[^>]*>/, '').replace(/<\/text>/, ''))
        .map(text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .join(' ')
        .trim();
    }
    return '';
  }

}

