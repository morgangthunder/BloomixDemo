import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, NotFoundException } from 'typeorm';
import { InteractionTypesService } from './interaction-types.service';
import { InteractionType } from '../../entities/interaction-type.entity';
import { FileStorageService } from '../../services/file-storage.service';

describe('InteractionTypesService', () => {
  let service: InteractionTypesService;
  let repository: jest.Mocked<Repository<InteractionType>>;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const mockInteraction: InteractionType = {
    id: 'test-iframe-interaction',
    name: 'Test Iframe Interaction',
    description: 'Test description',
    interactionTypeCategory: 'iframe',
    iframeUrl: 'https://example.com/embed',
    iframeConfig: {
      width: '100%',
      height: '600px',
      screenshotTriggers: {
        iframeLoad: true,
        iframeUrlChange: true,
        postMessage: false,
        scriptBlockComplete: true,
        periodic: true,
        periodicInterval: 30,
      },
    },
    iframeDocumentUrl: null,
    iframeDocumentFileName: null,
    schema: {},
    generationPrompt: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InteractionType;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockFileStorageService = {
      saveFile: jest.fn(),
      deleteFile: jest.fn(),
      readFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionTypesService,
        {
          provide: getRepositoryToken(InteractionType),
          useValue: mockRepository,
        },
        {
          provide: FileStorageService,
          useValue: mockFileStorageService,
        },
      ],
    }).compile();

    service = module.get<InteractionTypesService>(InteractionTypesService);
    repository = module.get(getRepositoryToken(InteractionType));
    fileStorageService = module.get(FileStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return an interaction type by id', async () => {
      repository.findOne.mockResolvedValue(mockInteraction);

      const result = await service.findOne('test-iframe-interaction');

      expect(result).toEqual(mockInteraction);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-iframe-interaction' },
      });
    });

    it('should return null if interaction not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update interaction type', async () => {
      const updateData = {
        name: 'Updated Name',
        iframeConfig: {
          screenshotTriggers: {
            iframeLoad: false,
          },
        },
      };

      repository.update.mockResolvedValue({ affected: 1 } as any);
      repository.findOne.mockResolvedValue({
        ...mockInteraction,
        ...updateData,
      } as InteractionType);

      const result = await service.update('test-iframe-interaction', updateData);

      expect(repository.update).toHaveBeenCalledWith('test-iframe-interaction', updateData);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('uploadDocument', () => {
    const mockFile = {
      originalname: 'test-document.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test file content'),
      size: 1024,
    } as any;

    it('should upload document and update interaction', async () => {
      repository.findOne.mockResolvedValue(mockInteraction);
      fileStorageService.saveFile.mockResolvedValue({
        url: '/uploads/interaction-documents/uuid.pdf',
        fileName: 'test-document.pdf',
      });
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.uploadDocument('test-iframe-interaction', mockFile);

      expect(fileStorageService.saveFile).toHaveBeenCalledWith(mockFile, 'interaction-documents');
      expect(repository.update).toHaveBeenCalledWith('test-iframe-interaction', {
        iframeDocumentUrl: '/uploads/interaction-documents/uuid.pdf',
        iframeDocumentFileName: 'test-document.pdf',
      });
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('/uploads/interaction-documents/uuid.pdf');
      expect(result.data.fileName).toBe('test-document.pdf');
    });

    it('should delete old document before uploading new one', async () => {
      const interactionWithDoc = {
        ...mockInteraction,
        iframeDocumentUrl: '/uploads/interaction-documents/old.pdf',
        iframeDocumentFileName: 'old.pdf',
      };
      repository.findOne.mockResolvedValue(interactionWithDoc);
      fileStorageService.saveFile.mockResolvedValue({
        url: '/uploads/interaction-documents/new.pdf',
        fileName: 'new-document.pdf',
      });
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.uploadDocument('test-iframe-interaction', mockFile);

      expect(fileStorageService.deleteFile).toHaveBeenCalledWith('/uploads/interaction-documents/old.pdf');
    });

    it('should throw NotFoundException if interaction not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadDocument('non-existent', mockFile),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDocument', () => {
    it('should remove document and clear fields', async () => {
      const interactionWithDoc = {
        ...mockInteraction,
        iframeDocumentUrl: '/uploads/interaction-documents/test.pdf',
        iframeDocumentFileName: 'test.pdf',
      };
      repository.findOne.mockResolvedValue(interactionWithDoc);
      fileStorageService.deleteFile.mockResolvedValue(undefined);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.removeDocument('test-iframe-interaction');

      expect(fileStorageService.deleteFile).toHaveBeenCalledWith('/uploads/interaction-documents/test.pdf');
      expect(repository.update).toHaveBeenCalledWith('test-iframe-interaction', {
        iframeDocumentUrl: undefined,
        iframeDocumentFileName: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if interaction not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.removeDocument('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

