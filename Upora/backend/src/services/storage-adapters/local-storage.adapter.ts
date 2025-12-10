import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as fsSync from 'fs';
import { randomUUID } from 'crypto';
import { IStorageAdapter } from '../storage-interface';
import { Readable } from 'stream';

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;

  constructor() {
    const uploadDirEnv = process.env.UPLOAD_DIR || './uploads';
    // Ensure uploadDir is absolute
    this.uploadDir = path.isAbsolute(uploadDirEnv) 
      ? uploadDirEnv 
      : path.resolve(process.cwd(), uploadDirEnv);
  }

  async saveFile(
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    subfolder: string = 'documents',
  ): Promise<{ url: string; fileName: string; filePath: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, subfolder, fileName);
    const dirPath = path.dirname(filePath);

    // Ensure subfolder exists
    await fs.mkdir(dirPath, { recursive: true });

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return URL (relative path for local storage)
    const url = `/uploads/${subfolder}/${fileName}`;

    this.logger.log(`File saved: ${filePath} -> ${url}`);

    return {
      url,
      fileName: file.originalname,
      filePath, // Return actual file path for local storage
    };
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlPath = url.replace('/uploads/', '');
      const filePath = path.join(this.uploadDir, urlPath);

      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        // Ignore file not found errors
        this.logger.error(`Failed to delete file ${url}: ${error.message}`);
        throw error;
      }
    }
  }

  async readFile(url: string): Promise<Buffer> {
    const urlPath = url.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, urlPath);
    return fs.readFile(filePath);
  }

  async fileExists(url: string): Promise<boolean> {
    try {
      const urlPath = url.replace('/uploads/', '');
      const filePath = path.join(this.uploadDir, urlPath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStream(url: string): Promise<NodeJS.ReadableStream> {
    const urlPath = url.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, urlPath);
    const buffer = await fs.readFile(filePath);
    return Readable.from(buffer);
  }

  /**
   * Get the actual file system path for a URL (local storage only)
   * Returns absolute path
   */
  getFilePath(url: string): string {
    const urlPath = url.replace('/uploads/', '');
    // uploadDir is already absolute, so join will give us absolute path
    const filePath = path.join(this.uploadDir, urlPath);
    // Ensure it's absolute (should already be, but double-check)
    return path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(this.uploadDir, urlPath);
  }
}

