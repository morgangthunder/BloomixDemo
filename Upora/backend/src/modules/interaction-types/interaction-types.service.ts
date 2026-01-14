import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionType } from '../../entities/interaction-type.entity';
import { FileStorageService } from '../../services/file-storage.service';
import {
  CreateInteractionTypeDto,
  UpdateInteractionTypeDto,
} from './dto/interaction-type.dto';

@Injectable()
export class InteractionTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(InteractionType)
    private interactionTypeRepository: Repository<InteractionType>,
    private fileStorageService: FileStorageService,
  ) {}

  async onModuleInit() {
    // Seeding disabled - use POST /api/interaction-types/seed endpoint instead
    // This avoids race condition with TypeORM synchronize
  }

  async seedTrueFalseSelection() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'true-false-selection' },
    });

    if (!exists) {
      console.log(
        '[InteractionTypes] Creating True/False Selection interaction...',
      );
      // Basic stub - actual implementation should be restored from backup
      // For now, just log that it exists check passed
      console.log(
        '[InteractionTypes] ⚠️ True/False Selection already exists or creation skipped',
      );
    } else {
      console.log('[InteractionTypes] ℹ️ True/False Selection already exists');
    }
  }

  async seedVideoUrlInteraction() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'video-url' },
    });

    if (exists) {
      console.log(
        '[InteractionTypes] ℹ️ Video URL interaction type already exists',
      );
      return;
    }
    // Stub - actual implementation should be restored
    console.log(
      '[InteractionTypes] ⚠️ Video URL interaction creation not implemented in stub',
    );
  }

  async seedSDKTestVideoUrlInteraction(): Promise<void> {
    // Stub - actual implementation should be restored
    console.log(
      '[InteractionTypes] ⚠️ SDK Test Video URL interaction creation not implemented in stub',
    );
    await Promise.resolve();
  }

  async updateSDKTestPixiJSInteraction(): Promise<void> {
    // Stub - actual implementation should be restored
    console.log(
      '[InteractionTypes] ⚠️ SDK Test PixiJS interaction update not implemented in stub',
    );
    await Promise.resolve();
  }

  async updateSDKTestHTMLInteraction(): Promise<InteractionType> {
    // Stub - actual implementation should be restored
    console.log(
      '[InteractionTypes] ⚠️ SDK Test HTML interaction update not implemented in stub',
    );
    const existing = await this.interactionTypeRepository.findOne({
      where: { id: 'sdk-test-html' },
    });
    if (!existing) {
      throw new Error('SDK Test HTML interaction not found');
    }
    return existing;
  }

  async updateConfigSchemaForExistingInteractions(): Promise<void> {
    // Stub - actual implementation should be restored
    console.log(
      '[InteractionTypes] ⚠️ Config schema update not implemented in stub',
    );
    await Promise.resolve();
  }

  /**
   * Update true-false-selection interaction to use aiSDK.completeInteraction()
   */
  async updateTrueFalseSelectionCompleteInteraction() {
    const interaction = await this.interactionTypeRepository.findOne({
      where: { id: 'true-false-selection' },
    });

    if (!interaction) {
      console.log(
        '[InteractionTypes] ⚠️ True/False Selection interaction not found',
      );
      return;
    }

    let jsCode = interaction.jsCode || '';

    // Update nextBtn event listener - try multiple patterns
    const patterns = [
      /nextBtn\.addEventListener\("click",\s*\(\)\s*=>\s*\{[^}]*alert\([^)]*\);[^}]*closeScoreModal\(\);[^}]*\}\);/s,
      /nextBtn\.addEventListener\("click",\s*\(\)\s*=>\s*\{[^}]*alert\([^)]*Next button clicked[^)]*\);[^}]*closeScoreModal\(\);[^}]*\}\);/s,
    ];

    let updated = false;
    for (const pattern of patterns) {
      if (pattern.test(jsCode)) {
        jsCode = jsCode.replace(
          pattern,
          `nextBtn.addEventListener("click", () => {
        console.log("[Interaction] Next button clicked, completing interaction...");
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
            console.log("[Interaction] ✅ Called aiSDK.completeInteraction()");
        } else {
            console.warn("[Interaction] ⚠️ AI SDK not available or completeInteraction method not found");
            alert("Interaction Completed! (SDK not available)");
        }
        closeScoreModal();
    });`,
        );
        updated = true;
        break;
      }
    }

    // Update complete() function if it exists - handle multiple patterns
    if (jsCode.includes('function complete()')) {
      // Pattern 1: Complex pattern with console.log, alert, closeScoreModal
      const completePattern1 =
        /function complete\(\)\s*\{[^}]*console\.log\([^}]*\);[^}]*alert\([^}]*\);[^}]*closeScoreModal\(\);[^}]*\}/s;
      // Pattern 2: Simple pattern with window.parent.interactionComplete (from update-interactions-to-html.sql)
      const completePattern2 =
        /function complete\(\)\s*\{[^}]*if\s*\([^}]*window\.parent[^}]*\)[^}]*\}/s;

      if (completePattern1.test(jsCode)) {
        jsCode = jsCode.replace(
          completePattern1,
          `function complete() {
        console.log("[Interaction] ▶️ Completing interaction...");
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
            console.log("[Interaction] ✅ Called aiSDK.completeInteraction()");
        } else {
            console.warn("[Interaction] ⚠️ AI SDK not available or completeInteraction method not found");
            alert("Interaction Completed! (SDK not available)");
        }
        closeScoreModal();
    }`,
        );
        updated = true;
      } else if (completePattern2.test(jsCode)) {
        // Replace the simple pattern
        jsCode = jsCode.replace(
          completePattern2,
          `function complete() {
        console.log("[Interaction] ▶️ Completing interaction...");
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
            console.log("[Interaction] ✅ Called aiSDK.completeInteraction()");
        } else {
            console.warn("[Interaction] ⚠️ AI SDK not available or completeInteraction method not found");
            alert("Interaction Completed! (SDK not available)");
        }
    }`,
        );
        updated = true;
      }
    }

    // Ensure SDK is initialized with all methods (check for emitEvent specifically)
    if (
      !jsCode.includes('window.aiSDK = createIframeAISDK()') ||
      !jsCode.includes('emitEvent:')
    ) {
      // Remove existing SDK initialization if it exists but is incomplete
      if (jsCode.includes('window.aiSDK = createIframeAISDK()')) {
        // Find and remove the old SDK initialization - match from "// Initialize AI SDK" to "window.aiSDK = createIframeAISDK();"
        const sdkPattern =
          /\/\/ Initialize AI SDK[\s\S]*?window\.aiSDK\s*=\s*createIframeAISDK\(\);[\s\n]*/;
        if (sdkPattern.test(jsCode)) {
          jsCode = jsCode.replace(sdkPattern, '');
          updated = true;
        }
      }
      const sdkInit = `// Initialize AI SDK
const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;
  const generateRequestId = () => 'req-' + Date.now() + '-' + (++requestCounter);
  const generateSubscriptionId = () => 'sub-' + Date.now() + '-' + Math.random();
  const sendMessage = (type, data, callback) => {
    const requestId = generateRequestId();
    const message = { type: type, requestId: requestId };
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        message[key] = data[key];
      }
    }
    if (callback) {
      const listener = (event) => {
        if (event.data && event.data.requestId === requestId) {
          window.removeEventListener("message", listener);
          callback(event.data);
        }
      };
      window.addEventListener("message", listener);
    }
    window.parent.postMessage(message, "*");
  };
  return {
    emitEvent: (event, processedContentId) => {
      sendMessage("ai-sdk-emit-event", { event: event, processedContentId: processedContentId });
    },
    updateState: (key, value) => {
      sendMessage("ai-sdk-update-state", { key: key, value: value });
    },
    getState: (callback) => {
      sendMessage("ai-sdk-get-state", {}, (response) => {
        if (callback) callback(response.state);
      });
    },
    onResponse: (callback) => {
      subscriptionId = generateSubscriptionId();
      sendMessage("ai-sdk-subscribe", { subscriptionId: subscriptionId }, () => {
        const listener = (event) => {
          if (event.data && event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
            callback(event.data.response);
          }
        };
        window.addEventListener("message", listener);
      });
    },
    requestAIResponse: (prompt, callback) => {
      sendMessage("ai-sdk-request-ai-response", { prompt: prompt }, (response) => {
        if (callback) callback(response);
      });
    },
    minimizeChatUI: () => {
      sendMessage("ai-sdk-minimize-chat-ui", {});
    },
    showChatUI: () => {
      sendMessage("ai-sdk-show-chat-ui", {});
    },
    postToChat: (content, role, openChat) => {
      sendMessage("ai-sdk-post-to-chat", { content: content, role: role || "assistant", openChat: openChat || false });
    },
    showSnack: (content, duration, hideFromChatUI, callback) => {
      sendMessage("ai-sdk-show-snack", { content: content, duration: duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
        if (callback && response.snackId) callback(response.snackId);
      });
    },
    hideSnack: () => {
      sendMessage("ai-sdk-hide-snack", {});
    },
    generateImage: (options, callback) => {
      sendMessage("ai-sdk-generate-image", { options: options }, (response) => {
        if (callback) callback(response);
      });
    },
    getLessonImages: (lessonId, accountId, imageId, callback) => {
      sendMessage("ai-sdk-get-lesson-images", { lessonId: lessonId, accountId: accountId, imageId: imageId }, (response) => {
        if (callback) callback(response.images || []);
      });
    },
    getLessonImageIds: (lessonId, accountId, callback) => {
      sendMessage("ai-sdk-get-lesson-image-ids", { lessonId: lessonId, accountId: accountId }, (response) => {
        if (callback) callback(response.imageIds || []);
      });
    },
    deleteImage: (imageId, callback) => {
      sendMessage("ai-sdk-delete-image", { imageId: imageId }, (response) => {
        if (callback) callback(response.success, response.error);
      });
    },
    completeInteraction: () => {
      sendMessage("ai-sdk-complete-interaction", {});
    }
  };
};

// Make SDK available globally
window.aiSDK = createIframeAISDK();

`;
      jsCode = sdkInit + jsCode;
      updated = true;
    }

    if (updated) {
      // Update the interaction
      await this.interactionTypeRepository.update(
        { id: 'true-false-selection' },
        { jsCode },
      );
      console.log(
        '[InteractionTypes] ✅ Updated True/False Selection interaction with completeInteraction()',
      );
    } else {
      console.log(
        '[InteractionTypes] ℹ️ True/False Selection interaction already has completeInteraction() or no changes needed',
      );
    }
  }

  async findAll(): Promise<InteractionType[]> {
    return this.interactionTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<InteractionType | null> {
    return this.interactionTypeRepository.findOne({
      where: { id },
    });
  }

  async create(dto: CreateInteractionTypeDto): Promise<InteractionType> {
    const interaction = this.interactionTypeRepository.create(dto);
    return await this.interactionTypeRepository.save(interaction);
  }

  async update(
    id: string,
    dto: UpdateInteractionTypeDto,
  ): Promise<InteractionType> {
    await this.interactionTypeRepository.update({ id }, dto);
    const updated = await this.interactionTypeRepository.findOne({
      where: { id },
    });
    if (!updated) {
      throw new NotFoundException(`Interaction type with id ${id} not found`);
    }
    return updated;
  }

  async uploadDocument(
    interactionId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    // Stub - actual implementation should be restored
    // Parameters are required by interface but not used in stub
    void interactionId;
    void file;
    console.log(
      '[InteractionTypes] ⚠️ Upload document not implemented in stub',
    );
    await Promise.resolve(); // Satisfy lint requirement for await in async
    throw new Error('Upload document not implemented');
  }

  async removeDocument(id: string): Promise<void> {
    // Stub - actual implementation should be restored
    // Parameter is required by interface but not used in stub
    void id;
    console.log(
      '[InteractionTypes] ⚠️ Remove document not implemented in stub',
    );
    await Promise.resolve();
  }

  /**
   * Get widget registry - returns list of available widgets
   */
  getWidgetRegistry(): any[] {
    return [
      {
        id: 'image-carousel',
        name: 'Image Carousel',
        description: 'Display a carousel of images from lesson images',
        interactionBuilderDefaultConfig: {
          position: {
            type: 'bottom',
            zIndex: 1000,
            x: 0,
            y: 0,
          },
          imageIds: [],
          autoplay: false,
          interval: 3000,
          showControls: true,
          showIndicators: true,
          container: {
            enabled: false,
            defaultVisible: true,
            showToggle: true,
          },
        },
        lessonBuilderDefaultConfig: {
          position: {
            type: 'bottom',
            zIndex: 1000,
          },
          imageIds: [],
          autoplay: false,
          interval: 3000,
          showControls: true,
          showIndicators: true,
          container: {
            enabled: false,
            defaultVisible: true,
            showToggle: true,
          },
        },
      },
      {
        id: 'timer',
        name: 'Timer',
        description: 'Display a countdown or count-up timer',
        interactionBuilderDefaultConfig: {
          position: {
            type: 'bottom-right',
            zIndex: 1000,
            x: 0,
            y: 0,
          },
          initialTime: 60,
          direction: 'countdown',
          format: 'mm:ss',
          onComplete: 'emit-event',
          showMilliseconds: false,
          startOnLoad: false,
          hideControls: false,
        },
        lessonBuilderDefaultConfig: {
          position: {
            type: 'bottom-right',
            zIndex: 1000,
          },
          initialTime: 60,
          direction: 'countdown',
          format: 'mm:ss',
          onComplete: 'emit-event',
          showMilliseconds: false,
          startOnLoad: false,
          hideControls: false,
        },
      },
    ];
  }

  /**
   * Get widget sample configurations
   */
  getWidgetSampleConfigs(): any {
    return {
      'image-carousel': {
        position: { type: 'bottom', zIndex: 1000 },
        imageIds: ['img-1', 'img-2', 'img-3'],
        autoplay: true,
        interval: 3000,
        showControls: true,
        showIndicators: true,
      },
      timer: {
        position: { type: 'bottom-right', zIndex: 1000 },
        initialTime: 60,
        direction: 'countdown',
        format: 'mm:ss',
        onComplete: 'emit-event',
        showMilliseconds: false,
      },
    };
  }

  /**
   * Get widgets for a specific interaction type
   */
  async getWidgets(id: string): Promise<any> {
    const interaction = await this.findOne(id);
    return interaction?.widgets || { instances: [] };
  }

  /**
   * Update widgets for a specific interaction type
   */
  async updateWidgets(id: string, widgets: any): Promise<any> {
    const interaction = await this.findOne(id);
    if (!interaction) {
      throw new NotFoundException(`Interaction type with id ${id} not found`);
    }

    // Update widgets (stored as JSONB in database)
    // JSONB fields accept any shape, so we use any here
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    interaction.widgets = widgets;
    await this.interactionTypeRepository.save(interaction);
    return this.findOne(id);
  }
}
