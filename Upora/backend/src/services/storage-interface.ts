/**
 * Storage Interface for File Operations
 * 
 * This interface abstracts file storage operations to make it easy to switch
 * between local filesystem storage and cloud storage (S3, MinIO, etc.)
 */

export interface IStorageAdapter {
  /**
   * Save a file and return its URL
   * @param file - File buffer and metadata
   * @param subfolder - Subfolder path (e.g., 'media', 'documents')
   * @returns URL to access the file
   */
  saveFile(
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    subfolder?: string,
  ): Promise<{ url: string; fileName: string; filePath?: string }>;

  /**
   * Delete a file by URL
   * @param url - File URL
   */
  deleteFile(url: string): Promise<void>;

  /**
   * Read file content
   * @param url - File URL
   * @returns File buffer
   */
  readFile(url: string): Promise<Buffer>;

  /**
   * Check if a file exists
   * @param url - File URL
   * @returns True if file exists
   */
  fileExists(url: string): Promise<boolean>;

  /**
   * Get a file stream for reading (useful for large files)
   * @param url - File URL
   * @returns Readable stream
   */
  getFileStream?(url: string): Promise<NodeJS.ReadableStream>;

  /**
   * Get a signed URL for temporary access (for S3/MinIO)
   * @param url - File URL
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  getSignedUrl?(url: string, expiresIn?: number): Promise<string>;

  /**
   * Save a buffer at a specific key (e.g. for transcripts: transcripts/tenant/user/session.json)
   * @param key - Full storage key/path
   * @param buffer - Content buffer
   * @param contentType - MIME type (e.g. application/json)
   * @returns URL to access the stored object
   */
  saveBuffer?(key: string, buffer: Buffer, contentType: string): Promise<{ url: string }>;

  /**
   * Read content by storage key (e.g. transcripts/tenant/user/session.json)
   */
  getByKey?(key: string): Promise<Buffer>;
}


