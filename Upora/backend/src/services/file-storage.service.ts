import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IStorageAdapter } from './storage-interface';
import { LocalStorageAdapter } from './storage-adapters/local-storage.adapter';
import { S3StorageAdapter } from './storage-adapters/s3-storage.adapter';

/**
 * File Storage Service
 * 
 * Provides a unified interface for file storage operations.
 * Automatically selects the appropriate storage adapter based on environment variables:
 * - STORAGE_TYPE=local (default) - uses LocalStorageAdapter
 * - STORAGE_TYPE=s3 - uses S3StorageAdapter (supports AWS S3 and MinIO)
 * 
 * To switch from local to cloud storage, simply:
 * 1. Set STORAGE_TYPE=s3
 * 2. Configure S3 environment variables (see S3StorageAdapter)
 * 3. No code changes needed!
 */
@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private adapter: IStorageAdapter;

  constructor() {
    const storageType = process.env.STORAGE_TYPE || 'local';
    
    if (storageType === 's3') {
      try {
        this.logger.log('Using S3/MinIO storage adapter');
        this.adapter = new S3StorageAdapter();
      } catch (error: any) {
        this.logger.error(`Failed to initialize S3 adapter: ${error.message}`);
        this.logger.warn('Falling back to local storage adapter');
        this.adapter = new LocalStorageAdapter();
      }
    } else {
      this.logger.log('Using local filesystem storage adapter');
      this.adapter = new LocalStorageAdapter();
    }
  }

  async onModuleInit() {
    // Adapters handle their own initialization
    this.logger.log('FileStorageService initialized');
  }

  /**
   * Save uploaded file and return URL
   */
  async saveFile(
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    subfolder: string = 'documents',
  ): Promise<{ url: string; fileName: string; filePath?: string }> {
    return this.adapter.saveFile(file, subfolder);
  }

  /**
   * Delete file by URL
   */
  async deleteFile(url: string): Promise<void> {
    return this.adapter.deleteFile(url);
  }

  /**
   * Read file content (for document processing)
   */
  async readFile(url: string): Promise<Buffer> {
    return this.adapter.readFile(url);
  }

  /**
   * Check if a file exists
   */
  async fileExists(url: string): Promise<boolean> {
    return this.adapter.fileExists(url);
  }

  /**
   * Get file stream (for large files)
   */
  async getFileStream(url: string): Promise<NodeJS.ReadableStream> {
    if (this.adapter.getFileStream) {
      return this.adapter.getFileStream(url);
    }
    // Fallback: read entire file into buffer and create stream
    const buffer = await this.adapter.readFile(url);
    const { Readable } = require('stream');
    return Readable.from(buffer);
  }

  /**
   * Get signed URL for temporary access (S3/MinIO only)
   */
  async getSignedUrl(url: string, expiresIn?: number): Promise<string | null> {
    if (this.adapter.getSignedUrl) {
      return this.adapter.getSignedUrl(url, expiresIn);
    }
    // Local storage doesn't need signed URLs
    return null;
  }

  /**
   * Save JSON transcript (or any object) at a specific key. Used for lesson engagement transcripts in MinIO/S3.
   */
  async saveTranscript(key: string, data: object): Promise<{ url: string }> {
    const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
    if (this.adapter.saveBuffer) {
      return this.adapter.saveBuffer(key, buffer, 'application/json');
    }
    // Fallback: use saveFile with a synthetic file
    const ext = key.endsWith('.json') ? '.json' : '';
    const subfolder = key.includes('/') ? key.substring(0, key.lastIndexOf('/')) : 'transcripts';
    const result = await this.adapter.saveFile(
      { buffer, originalname: key.split('/').pop() || 'transcript.json', mimetype: 'application/json' },
      subfolder,
    );
    return { url: result.url };
  }

  /**
   * Read transcript (or any JSON) from storage by key. Returns parsed object or null if not found.
   */
  async getTranscriptContent(key: string): Promise<object | null> {
    if (!this.adapter.getByKey) return null;
    try {
      const buffer = await this.adapter.getByKey(key);
      return JSON.parse(buffer.toString('utf8')) as object;
    } catch {
      return null;
    }
  }

  /**
   * Get the actual file path (local storage only)
   * For S3, returns the S3 key
   */
  getFilePath(url: string): string | null {
    if (this.adapter instanceof LocalStorageAdapter) {
      return (this.adapter as any).getFilePath(url);
    }
    // For S3, extract key from URL
    return null;
  }
}

