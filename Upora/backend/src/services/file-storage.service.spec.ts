import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageService } from './file-storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

describe('FileStorageService', () => {
  let service: FileStorageService;
  const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
  const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
  const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
  const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileStorageService],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create upload directory', async () => {
      mockMkdir.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockMkdir).toHaveBeenCalledWith('./uploads', { recursive: true });
    });
  });

  describe('saveFile', () => {
    const mockFile = {
      originalname: 'test-document.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test content'),
      size: 1024,
    } as any;

    it('should save file and return URL', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await service.saveFile(mockFile, 'documents');

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads[\\/]documents/),
        { recursive: true },
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid-123.pdf'),
        mockFile.buffer,
      );
      expect(result.url).toContain('/uploads/documents/');
      expect(result.fileName).toBe('test-document.pdf');
    });

    it('should use default subfolder if not provided', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await service.saveFile(mockFile);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringMatching(/uploads[\\/]documents/),
        { recursive: true },
      );
    });
  });

  describe('deleteFile', () => {
    it('should delete file by URL', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await service.deleteFile('/uploads/documents/test-uuid-123.pdf');

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/uploads[\\/]documents[\\/]test-uuid-123\.pdf/),
      );
    });

    it('should not throw if file does not exist', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      await expect(service.deleteFile('/uploads/documents/non-existent.pdf')).resolves.not.toThrow();
    });

    it('should throw if deletion fails for other reasons', async () => {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      mockUnlink.mockRejectedValue(error);

      await expect(service.deleteFile('/uploads/documents/test.pdf')).rejects.toThrow('Permission denied');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const fileContent = Buffer.from('test content');
      mockReadFile.mockResolvedValue(fileContent);

      const result = await service.readFile('/uploads/documents/test.pdf');

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringMatching(/uploads[\\/]documents[\\/]test\.pdf/),
      );
      expect(result).toEqual(fileContent);
    });
  });
});

