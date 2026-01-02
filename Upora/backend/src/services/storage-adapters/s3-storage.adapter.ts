import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { IStorageAdapter } from '../storage-interface';
import { Readable } from 'stream';

// Dynamically import AWS SDK to make it optional
let S3Client: any;
let PutObjectCommand: any;
let DeleteObjectCommand: any;
let GetObjectCommand: any;
let getSignedUrl: any;

try {
  const awsSdk = require('@aws-sdk/client-s3');
  const presigner = require('@aws-sdk/s3-request-presigner');
  S3Client = awsSdk.S3Client;
  PutObjectCommand = awsSdk.PutObjectCommand;
  DeleteObjectCommand = awsSdk.DeleteObjectCommand;
  GetObjectCommand = awsSdk.GetObjectCommand;
  getSignedUrl = presigner.getSignedUrl;
} catch (error) {
  // AWS SDK not installed - S3 adapter will throw error on initialization
}

/**
 * S3/MinIO Storage Adapter
 * 
 * Supports both AWS S3 and MinIO (S3-compatible storage)
 * Configure via environment variables:
 * - STORAGE_TYPE=s3
 * - S3_ENDPOINT (for MinIO, e.g., http://localhost:9000)
 * - S3_REGION (e.g., us-east-1)
 * - S3_BUCKET (bucket name)
 * - S3_ACCESS_KEY_ID
 * - S3_SECRET_ACCESS_KEY
 * - S3_USE_SSL (true/false, default: true for S3, false for MinIO)
 */
@Injectable()
export class S3StorageAdapter implements IStorageAdapter, OnModuleInit {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private s3Client: any; // S3Client type (dynamically imported) - for internal operations
  private s3ClientPublic: any; // S3Client for generating signed URLs with public endpoint
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor() {
    if (!S3Client) {
      throw new Error(
        'AWS SDK not installed. Install with: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
      );
    }

    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const useSSL = process.env.S3_USE_SSL !== 'false';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    }

    this.bucket = process.env.S3_BUCKET || 'upora-uploads';
    
    // For public URLs, use S3_PUBLIC_URL if set, otherwise construct from endpoint
    // For MinIO, convert internal Docker hostname to localhost for frontend access
    const publicUrl = process.env.S3_PUBLIC_URL || 
      (endpoint 
        ? endpoint.replace(/:\/\/minio:/, '://localhost:') // Convert minio:9000 to localhost:9000
        : `https://${this.bucket}.s3.${region}.amazonaws.com`);
    
    this.baseUrl = `${publicUrl}/${this.bucket}`;

    // Determine the endpoint for signed URLs
    // For MinIO: use public endpoint (localhost) so browsers can access signed URLs
    // For AWS S3: use undefined (default S3 endpoint) - signed URLs work with default endpoint
    const signedUrlEndpoint = endpoint 
      ? endpoint.replace(/:\/\/minio:/, '://localhost:') // MinIO: convert to localhost
      : undefined; // AWS S3: use default endpoint

    this.s3Client = new S3Client({
      endpoint: endpoint || undefined, // MinIO endpoint (internal Docker network) or AWS S3 default
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: !!endpoint, // Required for MinIO
    });

    // Create a separate client for signed URLs if needed (only for MinIO)
    // For AWS S3, we can use the same client since the endpoint is already public
    if (endpoint && signedUrlEndpoint !== endpoint) {
      // For MinIO: use public endpoint (localhost) for signed URLs
      this.s3ClientPublic = new S3Client({
        endpoint: signedUrlEndpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // Required for MinIO
      });
    } else {
      // For AWS S3: use the same client (no endpoint conversion needed)
      this.s3ClientPublic = this.s3Client;
    }

    this.logger.log(`S3 Storage initialized: ${endpoint ? 'MinIO' : 'AWS S3'} - Bucket: ${this.bucket}`);
    this.logger.log(`Public URL base: ${this.baseUrl}`);
    if (endpoint) {
      this.logger.log(`Signed URLs will use: ${signedUrlEndpoint}`);
    }
  }

  async onModuleInit() {
    // Verify bucket access on startup
    try {
      // This will be implemented when we add bucket verification
      this.logger.log('S3 Storage ready');
    } catch (error) {
      this.logger.error(`Failed to initialize S3 storage: ${error}`);
    }
  }

  async saveFile(
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    subfolder: string = 'documents',
  ): Promise<{ url: string; fileName: string; filePath?: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const key = `${subfolder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || this.getContentType(fileExtension),
    });

    await this.s3Client.send(command);

    // Return S3 URL
    const url = `${this.baseUrl}/${key}`;

    this.logger.log(`File saved to S3: ${key} -> ${url}`);

    return {
      url,
      fileName: file.originalname,
      filePath: key, // S3 key for reference
    };
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(url);
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted from S3: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete file from S3 ${url}: ${error.message}`);
      throw error;
    }
  }

  async readFile(url: string): Promise<Buffer> {
    const key = this.extractKeyFromUrl(url);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;
    
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async fileExists(url: string): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(url);
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStream(url: string): Promise<NodeJS.ReadableStream> {
    const key = this.extractKeyFromUrl(url);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async getSignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    const key = this.extractKeyFromUrl(url);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Use the public client for signing (uses localhost for MinIO)
    // This ensures the signature is valid for the public endpoint
    const signedUrl = await getSignedUrl(this.s3ClientPublic, command, { expiresIn });
    
    return signedUrl;
  }

  private extractKeyFromUrl(url: string): string {
    // Extract S3 key from URL
    // Format: http://endpoint/bucket/key or https://bucket.s3.region.amazonaws.com/key
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    // Remove bucket name if present
    if (pathParts[0] === this.bucket) {
      pathParts.shift();
    }
    
    return pathParts.join('/');
  }

  private getContentType(extension: string): string {
    const types: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogv': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    return types[extension.toLowerCase()] || 'application/octet-stream';
  }
}

