import { Test, TestingModule } from '@nestjs/testing';
import { InteractionTypesController } from './interaction-types.controller';
import { InteractionTypesService } from './interaction-types.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InteractionTypesController', () => {
  let controller: InteractionTypesController;
  let service: jest.Mocked<InteractionTypesService>;

  const mockFile = {
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test content'),
    size: 1024,
  } as any;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      uploadDocument: jest.fn(),
      removeDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InteractionTypesController],
      providers: [
        {
          provide: InteractionTypesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InteractionTypesController>(InteractionTypesController);
    service = module.get(InteractionTypesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      service.uploadDocument.mockResolvedValue({
        success: true,
        data: {
          url: '/uploads/interaction-documents/test.pdf',
          fileName: 'test-document.pdf',
        },
      });

      const result = await controller.uploadDocument(mockFile, 'test-interaction-id');

      expect(service.uploadDocument).toHaveBeenCalledWith('test-interaction-id', mockFile);
      expect(result.success).toBe(true);
      expect(result.data.fileName).toBe('test-document.pdf');
    });

    it('should throw BadRequestException if no file provided', async () => {
      await expect(
        controller.uploadDocument(null as any, 'test-interaction-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no interactionId provided', async () => {
      await expect(
        controller.uploadDocument(mockFile, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'image/jpeg',
      };

      await expect(
        controller.uploadDocument(invalidFile, 'test-interaction-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept PDF files', async () => {
      const pdfFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };
      service.uploadDocument.mockResolvedValue({
        success: true,
        data: { url: '/uploads/test.pdf', fileName: 'test.pdf' },
      });

      await controller.uploadDocument(pdfFile, 'test-interaction-id');

      expect(service.uploadDocument).toHaveBeenCalled();
    });

    it('should accept DOCX files', async () => {
      const docxFile = {
        ...mockFile,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      service.uploadDocument.mockResolvedValue({
        success: true,
        data: { url: '/uploads/test.docx', fileName: 'test.docx' },
      });

      await controller.uploadDocument(docxFile, 'test-interaction-id');

      expect(service.uploadDocument).toHaveBeenCalled();
    });

    it('should accept TXT files', async () => {
      const txtFile = {
        ...mockFile,
        mimetype: 'text/plain',
      };
      service.uploadDocument.mockResolvedValue({
        success: true,
        data: { url: '/uploads/test.txt', fileName: 'test.txt' },
      });

      await controller.uploadDocument(txtFile, 'test-interaction-id');

      expect(service.uploadDocument).toHaveBeenCalled();
    });
  });

  describe('removeDocument', () => {
    it('should remove document successfully', async () => {
      service.removeDocument.mockResolvedValue({ success: true });

      const result = await controller.removeDocument('test-interaction-id');

      expect(service.removeDocument).toHaveBeenCalledWith('test-interaction-id');
      expect(result.success).toBe(true);
    });
  });
});

