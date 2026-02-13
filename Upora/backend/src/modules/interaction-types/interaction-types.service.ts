import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionType } from '../../entities/interaction-type.entity';
import { FileStorageService } from '../../services/file-storage.service';
import {
  CreateInteractionTypeDto,
  UpdateInteractionTypeDto,
} from './dto/interaction-type.dto';
import { TRUE_FALSE_FIXED_JS } from './true-false-fixed-js';
import {
  SDK_TEST_IFRAME_HTML,
  SDK_TEST_IFRAME_CSS,
  SDK_TEST_IFRAME_JS,
  SDK_TEST_IFRAME_CONFIG,
} from './sdk-test-iframe-overlay';

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

    // Ensure true-false-selection has the latest fixed code with score saving
    try {
      await this.replaceTrueFalseJsWithFixedScoring();
    } catch (error) {
      console.warn(
        '[InteractionTypes] Failed to update true-false-selection on init:',
        error,
      );
    }

    // Ensure sdk-test-iframe has overlay code with score saving (audit fix)
    try {
      await this.ensureSDKTestIframeHasOverlayCode();
    } catch (error) {
      console.warn(
        '[InteractionTypes] Failed to update sdk-test-iframe on init:',
        error,
      );
    }
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
    console.log(
      '[InteractionTypes] 🔧 Updating SDK Test HTML interaction to use new widget SDK approach',
    );
    const existing = await this.interactionTypeRepository.findOne({
      where: { id: 'sdk-test-html' },
    });
    if (!existing) {
      throw new Error('SDK Test HTML interaction not found');
    }

    let jsCode = existing.jsCode || '';

    // Remove widget implementation code (now in SDK)
    // Remove: Widget Management section (_widgetInstances, _currentLessonId, _currentAccountId)
    jsCode = jsCode.replace(
      /\s*\/\/ Widget Management\s*const widgetInstances = new Map\(\);\s*let currentLessonId = null;\s*let currentAccountId = null;\s*/g,
      '',
    );

    // Remove: initImageCarousel function and all its implementation
    const initImageCarouselRegex = /\/\/ Widget Implementation Functions\s*function initImageCarousel\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(initImageCarouselRegex, '');

    // Remove: loadCarouselImages function
    const loadCarouselImagesRegex = /\s*function loadCarouselImages\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(loadCarouselImagesRegex, '');

    // Remove: createCarouselDisplay function
    const createCarouselDisplayRegex = /\s*function createCarouselDisplay\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(createCarouselDisplayRegex, '');

    // Remove: updateCarouselDisplay function
    const updateCarouselDisplayRegex = /\s*function updateCarouselDisplay\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(updateCarouselDisplayRegex, '');

    // Remove: initTimer function and all its implementation
    const initTimerRegex = /\s*function initTimer\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(initTimerRegex, '');

    // Remove: handleTimerComplete function
    const handleTimerCompleteRegex = /\s*function handleTimerComplete\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(handleTimerCompleteRegex, '');

    // Remove: formatTime function
    const formatTimeRegex = /\s*function formatTime\([^)]*\)\s*\{[\s\S]*?\}(?=\s*(?:\/\/|function|const|let|var|$))/g;
    jsCode = jsCode.replace(formatTimeRegex, '');

    // Remove: Widget initialization listener (the code that listens for SDK ready and initializes widgets)
    // This is the block that starts with "// Listen for SDK ready message to store lesson ID and account ID, and initialize widgets"
    const widgetInitListenerRegex =
      /\s*\/\/ Listen for SDK ready message[\s\S]*?window\.aiSDK\.initWidget\([^)]*\);\s*\}\s*\}\);\s*\}, 100\);\s*\}\s*\}\);\s*/g;
    jsCode = jsCode.replace(widgetInitListenerRegex, '');

    // Remove: Widget methods from createIframeAISDK return object
    // Remove: initWidget, initImageCarousel, initTimer, carouselNext, carouselPrevious, carouselGoTo, carouselGetCurrentIndex
    const widgetMethodsRegex =
      /,\s*\/\/ Widget Methods\s*initWidget:\s*function[^}]*\},\s*\/\/ Image Carousel Methods\s*carouselNext:\s*function[^}]*\},\s*carouselPrevious:\s*function[^}]*\},\s*carouselGoTo:\s*function[^}]*\},\s*carouselGetCurrentIndex:\s*function[^}]*\}/g;
    jsCode = jsCode.replace(widgetMethodsRegex, '');

    // Remove widget-related variables from initTestApp (imageSection, imageDisplayContainer, etc. if they're only for widgets)
    // But keep them if they're used for image generation testing

    // Remove widget toggle setup code from initTestApp
    const widgetToggleSetupRegex =
      /\s*\/\/ Set up widget carousel toggle functionality[\s\S]*?console\.log\('\[SDK Test HTML\] ✅ Widget timer toggle functionality initialized'\);\s*\}/g;
    jsCode = jsCode.replace(widgetToggleSetupRegex, '');

    // Clean up any double blank lines
    jsCode = jsCode.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Update the interaction
    existing.jsCode = jsCode;
    await this.interactionTypeRepository.save(existing);

    console.log(
      '[InteractionTypes] ✅ SDK Test HTML interaction updated - widget implementation removed (now in SDK)',
    );
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
   * Fix duplicate totalTrue declarations in true-false-selection interaction
   */
  async fixTrueFalseDuplicateTotalTrue() {
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

    // Count how many times totalTrue is declared
    const declarations = jsCode.match(/\b(let|const|var)\s+totalTrue\s*=/g);
    if (!declarations || declarations.length <= 1) {
      console.log(
        '[InteractionTypes] ℹ️ No duplicate totalTrue declarations found',
      );
      return;
    }

    console.log(
      `[InteractionTypes] ⚠️ Found ${declarations.length} declaration(s) of totalTrue, fixing...`,
    );

    // Strategy: Remove any totalTrue declarations outside of checkAnswers function
    // Keep only the one inside checkAnswers function

    // Find the checkAnswers function
    const checkAnswersStart = jsCode.indexOf('function checkAnswers()');
    if (checkAnswersStart === -1) {
      console.log(
        '[InteractionTypes] ⚠️ checkAnswers function not found, cannot fix',
      );
      return;
    }

    // Find the end of checkAnswers function (next function or end of code)
    const nextFunctionStart = jsCode.indexOf(
      '\nfunction ',
      checkAnswersStart + 25,
    );
    const checkAnswersEnd =
      nextFunctionStart === -1 ? jsCode.length : nextFunctionStart;

    // Split code into parts
    const beforeCheckAnswers = jsCode.substring(0, checkAnswersStart);
    const checkAnswersCode = jsCode.substring(
      checkAnswersStart,
      checkAnswersEnd,
    );
    const afterCheckAnswers = jsCode.substring(checkAnswersEnd);

    // Remove totalTrue declarations from before checkAnswers (handle multiline)
    const fixedBefore = beforeCheckAnswers.replace(
      /\s*(let|const|var)\s+totalTrue\s*=[^;]*;/g,
      '',
    );

    // Remove totalTrue declarations from after checkAnswers (handle multiline)
    const fixedAfter = afterCheckAnswers.replace(
      /\s*(let|const|var)\s+totalTrue\s*=[^;]*;/g,
      '',
    );

    // Remove ALL duplicate declarations inside checkAnswers, keep only one
    let fixedCheckAnswers = checkAnswersCode;
    const declarationsInCheckAnswers = checkAnswersCode.match(
      /\b(let|const|var)\s+totalTrue\s*=/g,
    );
    if (declarationsInCheckAnswers && declarationsInCheckAnswers.length > 1) {
      // Remove all but the first declaration inside checkAnswers
      // Use a more robust replacement that handles the full line including leading whitespace
      let replacementCount = 0;
      fixedCheckAnswers = checkAnswersCode.replace(
        /(\s*)(let|const|var)\s+totalTrue\s*=[^;]*;/g,
        (match) => {
          replacementCount++;
          if (replacementCount === 1) {
            return match; // Keep the first one
          }
          // Remove the entire line including the newline before it
          return ''; // Remove all subsequent declarations
        },
      );
      // Clean up any double newlines that might have been created
      fixedCheckAnswers = fixedCheckAnswers.replace(/\n\n\n+/g, '\n\n');
    }

    // Ensure checkAnswers has totalTrue declaration
    if (!/\b(let|const|var)\s+totalTrue\s*=\s*0/.test(fixedCheckAnswers)) {
      // Add declaration inside checkAnswers function body
      const functionBodyStart = fixedCheckAnswers.indexOf('{') + 1;
      fixedCheckAnswers =
        fixedCheckAnswers.substring(0, functionBodyStart) +
        '\n        let totalTrue = 0;\n        ' +
        fixedCheckAnswers.substring(functionBodyStart);
    }

    jsCode = fixedBefore + fixedCheckAnswers + fixedAfter;

    // Update the interaction
    await this.interactionTypeRepository.update(
      { id: 'true-false-selection' },
      { jsCode },
    );
    console.log(
      '[InteractionTypes] ✅ Fixed duplicate totalTrue declarations in True/False Selection interaction',
    );
  }

  /**
   * Update true-false-selection interaction to use aiSDK.completeInteraction()
   */
  /**
   * Update true-false interaction to save score before completing
   */
  async updateTrueFalseToSaveScore() {
    const interaction = await this.interactionTypeRepository.findOne({
      where: { id: 'true-false-selection' },
    });

    if (!interaction) {
      console.log('[InteractionTypes] ⚠️ True/False Selection interaction not found');
      return;
    }

    let jsCode = interaction.jsCode || '';
    let updated = false;

    // Find checkAnswers function and ensure it saves score before completing
    // Pattern: function checkAnswers() { ... score = ...; ... }
    const checkAnswersPattern = /function\s+checkAnswers\s*\([^)]*\)\s*\{([\s\S]*?)(?=\n\s*(?:function|const|let|var|$|nextBtn|playAgainBtn|closeScoreModal))/;
    const match = jsCode.match(checkAnswersPattern);
    
    if (match) {
      let checkAnswersBody = match[1];
      
      // Check if it already calls saveUserProgress
      if (!checkAnswersBody.includes('saveUserProgress') && !checkAnswersBody.includes('aiSDK.saveUserProgress')) {
        // Find where score is calculated and add saveUserProgress call right after
        // Look for score calculation pattern
        const scoreCalcPattern = /(score\s*=\s*[^;]+;)/;
        const scoreMatch = checkAnswersBody.match(scoreCalcPattern);
        
        if (scoreMatch) {
          // Insert saveUserProgress call after score calculation
          const insertPoint = checkAnswersBody.indexOf(scoreMatch[0]) + scoreMatch[0].length;
          const saveProgressCode = `
        
        // Save score before completing interaction
        if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
            window.aiSDK.saveUserProgress({
                score: score,
                completed: true
            }, (progress, error) => {
                if (error) {
                    console.error("[Interaction] ❌ Failed to save progress:", error);
                } else {
                    console.log("[Interaction] ✅ Progress saved with score:", score);
                }
            });
        }`;
          
          checkAnswersBody = checkAnswersBody.slice(0, insertPoint) + saveProgressCode + checkAnswersBody.slice(insertPoint);
          jsCode = jsCode.replace(checkAnswersPattern, `function checkAnswers() {${checkAnswersBody}`);
          updated = true;
          console.log('[InteractionTypes] ✅ Added saveUserProgress call to checkAnswers');
        }
      }
    }

    // Also ensure nextBtn calls saveUserProgress if score wasn't saved in checkAnswers
    if (!jsCode.includes('nextBtn.addEventListener') || !jsCode.includes('saveUserProgress')) {
      // Find nextBtn click handler and add saveUserProgress if score exists
      const nextBtnPattern = /nextBtn\.addEventListener\s*\(\s*["']click["']\s*,\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/;
      const nextBtnMatch = jsCode.match(nextBtnPattern);
      
      if (nextBtnMatch && !nextBtnMatch[1].includes('saveUserProgress')) {
        const nextBtnBody = nextBtnMatch[1];
        const saveProgressCode = `
        // Save score if not already saved
        if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function" && typeof score !== "undefined") {
            window.aiSDK.saveUserProgress({
                score: score,
                completed: true
            }, (progress, error) => {
                if (error) {
                    console.error("[Interaction] ❌ Failed to save progress:", error);
                } else {
                    console.log("[Interaction] ✅ Progress saved with score:", score);
                }
            });
        }`;
        
        // Insert before completeInteraction call
        const insertPoint = nextBtnBody.indexOf('completeInteraction') > -1 
          ? nextBtnBody.indexOf('completeInteraction')
          : nextBtnBody.indexOf('closeScoreModal');
        
        if (insertPoint > -1) {
          const newNextBtnBody = nextBtnBody.slice(0, insertPoint) + saveProgressCode + nextBtnBody.slice(insertPoint);
          jsCode = jsCode.replace(nextBtnPattern, `nextBtn.addEventListener("click", () => {${newNextBtnBody}})`);
          updated = true;
          console.log('[InteractionTypes] ✅ Added saveUserProgress call to nextBtn handler');
        }
      }
    }

    // Fix totalTrue: use truthy isTrueInContext or isTrue so we don't get "0 out of 0 correct"
    // !! coerces string "true", 1, etc. to boolean - handles various API/JSON formats
    const beforeTotalTrue = jsCode;
    // Match original and already-patched versions
    jsCode = jsCode.replace(
      /if\s*\(\s*fragment\.isTrueInContext\s*\)\s*totalTrue\+\+;/g,
      'if (!!fragment.isTrueInContext || !!fragment.isTrue) totalTrue++;'
    );
    jsCode = jsCode.replace(
      /if\s*\(\s*fragment\.isTrueInContext\s*===\s*true\s*\|\|\s*fragment\.isTrue\s*===\s*true\s*\)\s*totalTrue\+\+;/g,
      'if (!!fragment.isTrueInContext || !!fragment.isTrue) totalTrue++;'
    );
    if (jsCode !== beforeTotalTrue) {
      updated = true;
      console.log(
        '[InteractionTypes] ✅ Updated totalTrue to accept isTrueInContext or isTrue (truthy)'
      );
    }

    // Also fix correctCount check to accept both isTrueInContext and isTrue (truthy)
    const beforeCorrect = jsCode;
    jsCode = jsCode.replace(
      /if\s*\(\s*selectedFragments\.has\s*\(\s*index\s*\)\s*&&\s*fragment\.isTrueInContext\s*\)/g,
      'if (selectedFragments.has(index) && (!!fragment.isTrueInContext || !!fragment.isTrue))'
    );
    if (jsCode !== beforeCorrect) {
      updated = true;
    }

    // Fallback: if totalTrue is 0 but we have fragments, use fragments.length as denominator
    // This fixes "X out of 0 correct" when fragments lack isTrueInContext/isTrue
    if (!jsCode.includes('totalTrue === 0 && data.fragments')) {
      // Pattern 1: score = totalTrue > 0 ? ... (older style)
      const fallbackPattern1 = /(\n\s*score = totalTrue > 0)/;
      // Pattern 2: score = (correctCount / totalTrue) * 100 (fix-true-false-complete-js style)
      const fallbackPattern2 = /(\n\s*score = \(correctCount \/ totalTrue\) \* 100)/;
      const fallbackCode =
        '\n        if (totalTrue === 0 && data.fragments && data.fragments.length > 0) { totalTrue = data.fragments.length; }$1';
      if (fallbackPattern1.test(jsCode)) {
        jsCode = jsCode.replace(fallbackPattern1, fallbackCode);
        updated = true;
        console.log(
          '[InteractionTypes] ✅ Added totalTrue fallback (pattern 1) for missing isTrueInContext'
        );
      } else if (fallbackPattern2.test(jsCode)) {
        jsCode = jsCode.replace(fallbackPattern2, fallbackCode);
        updated = true;
        console.log(
          '[InteractionTypes] ✅ Added totalTrue fallback (pattern 2) for missing isTrueInContext'
        );
      }
    }

    if (updated) {
      await this.interactionTypeRepository.update(
        { id: 'true-false-selection' },
        { jsCode },
      );
      console.log('[InteractionTypes] ✅ Updated True/False Selection to save scores');
    } else {
      console.log('[InteractionTypes] ℹ️ True/False Selection already saves scores or no changes needed');
    }
  }

  /**
   * Ensure sdk-test-iframe has overlay code with score saving (Save User Progress, Mark Completed).
   * Only updates if html_code is empty (avoids overwriting user edits).
   */
  async ensureSDKTestIframeHasOverlayCode(): Promise<void> {
    const interaction = await this.interactionTypeRepository.findOne({
      where: { id: 'sdk-test-iframe' },
    });
    if (!interaction) {
      return;
    }
    const hasOverlayCode = !!(interaction.htmlCode && interaction.htmlCode.trim().length > 0);
    if (hasOverlayCode) {
      return;
    }
    await this.interactionTypeRepository.update(
      { id: 'sdk-test-iframe' },
      {
        htmlCode: SDK_TEST_IFRAME_HTML,
        cssCode: SDK_TEST_IFRAME_CSS,
        jsCode: SDK_TEST_IFRAME_JS,
        iframeConfig: SDK_TEST_IFRAME_CONFIG as any,
        description:
          'Comprehensive test interaction for all AI Teacher SDK functionality using an iframe with overlay mode. Includes Save User Progress and Mark Completed for scoring.',
      },
    );
    console.log(
      '[InteractionTypes] ✅ Added overlay code (with score saving) to sdk-test-iframe',
    );
  }

  /**
   * Full replace of true-false-selection jsCode with fixed scoring logic.
   * Use when regex patches fail - overwrites entire jsCode with known-good version.
   */
  async replaceTrueFalseJsWithFixedScoring(): Promise<void> {
    const result = await this.interactionTypeRepository.update(
      { id: 'true-false-selection' },
      { jsCode: TRUE_FALSE_FIXED_JS },
    );
    if (result.affected && result.affected > 0) {
      console.log('[InteractionTypes] ✅ Replaced true-false-selection jsCode with fixed scoring');
    } else {
      console.log('[InteractionTypes] ⚠️ true-false-selection not found, no update');
    }
  }

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
    const interaction = await this.interactionTypeRepository.findOne({
      where: { id },
    });
    if (!interaction) return null;
    // Runtime safeguard: ensure true-false-selection always has saveUserProgress in checkAnswers
    if (id === 'true-false-selection' && interaction.jsCode) {
      const checkAnswersIdx = interaction.jsCode.indexOf('function checkAnswers()');
      const hasSaveInCheckAnswers =
        checkAnswersIdx >= 0 &&
        interaction.jsCode.substring(checkAnswersIdx, checkAnswersIdx + 1500).includes('saveUserProgress');
      if (!hasSaveInCheckAnswers) {
        console.log('[InteractionTypes] ⚠️ true-false-selection missing saveUserProgress in checkAnswers, serving fixed JS');
        return { ...interaction, jsCode: TRUE_FALSE_FIXED_JS };
      }
    }
    return interaction;
  }

  async create(dto: CreateInteractionTypeDto): Promise<InteractionType> {
    const interaction = this.interactionTypeRepository.create(dto);
    return await this.interactionTypeRepository.save(interaction);
  }

  async update(
    id: string,
    dto: UpdateInteractionTypeDto,
  ): Promise<InteractionType> {
    try {
      console.log(`[InteractionTypesService] Updating interaction type ${id}`);
      console.log(`[InteractionTypesService] Update data keys: ${Object.keys(dto).join(', ')}`);
      if (dto.jsCode) {
        console.log(`[InteractionTypesService] jsCode length: ${dto.jsCode.length}`);
      }
      await this.interactionTypeRepository.update({ id }, dto);
      const updated = await this.interactionTypeRepository.findOne({
        where: { id },
      });
      if (!updated) {
        throw new NotFoundException(`Interaction type with id ${id} not found`);
      }
      return updated;
    } catch (error: any) {
      console.error(`[InteractionTypesService] ❌ Error updating interaction type ${id}:`, error);
      console.error(`[InteractionTypesService] Error message: ${error.message}`);
      console.error(`[InteractionTypesService] Error stack: ${error.stack}`);
      if (error.code) {
        console.error(`[InteractionTypesService] Error code: ${error.code}`);
      }
      if (error.detail) {
        console.error(`[InteractionTypesService] Error detail: ${error.detail}`);
      }
      throw error;
    }
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

  /**
   * Generate minimal HTML code for a widget
   * Returns minimal placeholder div - actual rendering handled by SDK
   */
  generateWidgetHTML(widgetId: string, config: any): string {
    const widgetIdSafe = widgetId.replace(/[^a-zA-Z0-9-]/g, '-');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const instanceId =
      (config?.instanceId as string) || `${widgetIdSafe}-${Date.now()}`;

    switch (widgetId) {
      case 'image-carousel':
        return `<!-- WIDGET:image-carousel:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:image-carousel:END -->`;
      case 'timer':
        return `<!-- WIDGET:timer:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:timer:END -->`;
      default:
        return `<!-- WIDGET:${widgetId}:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:${widgetId}:END -->`;
    }
  }

  /**
   * Generate minimal CSS code for a widget
   * Returns empty string - styling handled by SDK
   */
  generateWidgetCSS(widgetId: string): string {
    // Minimal CSS - most styling handled by widget SDK
    return `/* WIDGET:${widgetId}:START */\n/* WIDGET:${widgetId}:END */`;
  }

  /**
   * Generate minimal JavaScript code for a widget
   * Returns minimal initialization call to SDK function
   */
  generateWidgetJS(widgetId: string, config: any): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const instanceId =
      (config?.instanceId as string) ||
      `${widgetId.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`;
    const configPath = `window.interactionConfig?.widgetConfigs?.['${instanceId}']?.config || {}`;

    // Wait for SDK to be ready before initializing widget
    const waitForSDK = `
(function() {
  console.log('[Widget] Initializing ${widgetId} widget...');
  const initWidget = () => {
    console.log('[Widget] Checking SDK ready...', { 
      hasSDK: !!window.aiSDK, 
      hasConfig: !!window.interactionConfig, 
      hasWidgetConfigs: !!(window.interactionConfig && window.interactionConfig.widgetConfigs) 
    });
    if (window.aiSDK && window.interactionConfig && window.interactionConfig.widgetConfigs) {
      console.log('[Widget] SDK ready, initializing ${widgetId}...');
`;
    // Use initWidget for all widgets (unified approach)
    const initCall = `      if (window.aiSDK && window.aiSDK.initWidget) {
        console.log('[Widget] Calling initWidget for ${widgetId} with config:', ${configPath});
        // Extract config from widgetConfigs[instanceId].config
        const widgetConfig = ${configPath};
        // Ensure instanceId is included in config
        if (!widgetConfig.instanceId) {
          widgetConfig.instanceId = '${instanceId}';
        }
        window.aiSDK.initWidget('${widgetId}', '${instanceId}', widgetConfig);
      } else {
        console.warn('[Widget] initWidget method not found on aiSDK');
      }`;
    const waitForSDKEnd = `
    } else {
      // SDK not ready yet, try again after a short delay
      console.log('[Widget] SDK not ready yet, retrying...');
      setTimeout(initWidget, 100);
    }
  };
  
  // Wait for DOM to be ready, then wait for SDK
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Widget] DOM ready, waiting for SDK...');
      setTimeout(initWidget, 200);
    });
  } else {
    console.log('[Widget] DOM already ready, waiting for SDK...');
    setTimeout(initWidget, 200);
  }
})();
`;

    return `// WIDGET:${widgetId}:START
${waitForSDK}${initCall}
${waitForSDKEnd}
// WIDGET:${widgetId}:END`;
  }
}
