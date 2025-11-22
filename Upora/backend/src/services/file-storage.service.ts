import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

  async onModuleInit() {
    // Ensure upload directory exists
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ready: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
    }
  }

  /**
   * Save uploaded file and return URL
   */
  async saveFile(file: any, subfolder: string = 'documents'): Promise<{ url: string; fileName: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, subfolder, fileName);
    const dirPath = path.dirname(filePath);

    // Ensure subfolder exists
    await fs.mkdir(dirPath, { recursive: true });

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return URL (for now, relative path - can be upgraded to S3 URL)
    const url = `/uploads/${subfolder}/${fileName}`;
    
    this.logger.log(`File saved: ${filePath} -> ${url}`);
    
    return {
      url,
      fileName: file.originalname,
    };
  }

  /**
   * Delete file by URL
   */
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

  /**
   * Read file content (for document processing)
   */
  async readFile(url: string): Promise<Buffer> {
    const urlPath = url.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, urlPath);
    return fs.readFile(filePath);
  }
}

