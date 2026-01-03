import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionType } from '../../entities/interaction-type.entity';
import { FileStorageService } from '../../services/file-storage.service';

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
      const trueFalseSelection = this.interactionTypeRepository.create({
        id: 'true-false-selection',
        name: 'True/False Selection',
        category: 'tease-trigger',
        description: 'Students must identify and select all the TRUE statements from a collection of fragments. Used to activate prior knowledge and surface misconceptions early in a lesson.',
        schema: {
          type: 'object',
          required: ['fragments', 'targetStatement'],
          properties: {
            fragments: {
              type: 'array',
              items: {
                type: 'object',
                required: ['text', 'isTrueInContext', 'explanation'],
                properties: {
                  text: { type: 'string' },
                  isTrueInContext: { type: 'boolean' },
                  explanation: { type: 'string' },
                },
              },
            },
            targetStatement: { type: 'string' },
            maxFragments: { type: 'number', default: 8 },
          },
        },
        generationPrompt: `FROM CONTENT: {contentText}

TASK: Generate a True/False Selection interaction for the TEASE-Trigger phase.

PURPOSE: Activate prior knowledge, surface misconceptions, and hook students before diving into content.

1. IDENTIFY: 6-10 statements related to the content topic
   - Some statements are TRUE (based on content)
   - Some statements are FALSE (common misconceptions or incorrect variants)
   - Mix obvious and subtle differences
2. CREATE TARGET: Write a brief context/question that frames what to look for
3. WRITE EXPLANATIONS: For each statement, explain why it's true/false

EXAMPLE:
Content: "Photosynthesis converts light energy to chemical energy in plants"
Statements:
  - "Plants perform photosynthesis" (TRUE - core fact) ✓
  - "Chlorophyll captures sunlight" (TRUE - key molecule) ✓
  - "Plants eat soil" (FALSE - common misconception) ✗
  - "Photosynthesis occurs without light" (FALSE - light is required) ✗
  - "The process produces glucose and oxygen" (TRUE - outputs) ✓
  - "All living things photosynthesize" (FALSE - only plants and some bacteria) ✗

Target: "Which of these statements about photosynthesis are TRUE?"

CONFIDENCE SCORING:
- 0.9-1.0: Content has clear true/false statements with good misconceptions
- 0.7-0.9: Content allows statements but false options need creativity
- <0.7: Content too complex or unclear for true/false approach

OUTPUT FORMAT: Return ONLY valid JSON matching this structure:
{
  "confidence": 0.90,
  "output": {
    "fragments": [
      {"text": "Plants perform photosynthesis", "isTrueInContext": true, "explanation": "Plants are primary organisms that carry out photosynthesis"},
      {"text": "Plants eat soil", "isTrueInContext": false, "explanation": "Plants make their own food through photosynthesis, they don't consume soil"}
    ],
    "targetStatement": "Which of these statements about photosynthesis are TRUE?",
    "maxFragments": 8
  }
}`,
        pixiRenderer: 'TrueFalseSelectionComponent',
        minConfidence: 0.8,
        teachStageFit: ['tease-trigger'],
        cognitiveLoad: 'medium',
        estimatedDuration: 240, // 4 minutes
        assetRequirements: {
          uiElements: ['fragment-tile.png', 'checkmark.png', 'x-mark.png'],
          soundEffects: ['tap.mp3', 'correct.mp3', 'incorrect.mp3'],
          animations: ['shake-animation.json'],
        },
        mobileAdaptations: {
          tapToSelect: 'Large touch targets (min 48x48px)',
          shakeOnIncorrect: 'Haptic feedback for wrong selection',
          scrollableFragments: 'Horizontal scroll if >6 fragments on small screens',
        },
        scoringLogic:
          '(True fragments selected / Total true fragments) × 100. Incorrect selections do not penalize, just don\'t add to score. Clicking for explanations does not affect score.',
        isActive: true,
      });

      await this.interactionTypeRepository.save(trueFalseSelection);
      console.log('[InteractionTypes] ✅ True/False Selection seeded successfully');
    } else {
      console.log('[InteractionTypes] ℹ️ True/False Selection already exists');
    }
  }

  async seedVideoUrlInteraction() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'video-url' },
    });

    if (exists) {
      console.log('[InteractionTypes] ℹ️ Video URL interaction type already exists');
      return;
    }

    const videoUrl = this.interactionTypeRepository.create({
      id: 'video-url',
      name: 'Video URL',
      category: 'absorb-show',
      description:
        'Embed and control external video URLs (YouTube, Vimeo, etc.) with full SDK support and playback controls.',
      schema: {},
      generationPrompt:
        'Create a video URL interaction that embeds an external video (YouTube, Vimeo) with playback controls and SDK integration.',
      interactionTypeCategory: 'video-url',
      configSchema: {
        fields: [
          {
            key: 'autoplay',
            type: 'boolean',
            label: 'Autoplay',
            default: false,
            description: 'Automatically start playback when the interaction loads',
          },
          {
            key: 'loop',
            type: 'boolean',
            label: 'Loop',
            default: false,
            description: 'Loop the video when it reaches the end',
          },
          {
            key: 'defaultVolume',
            type: 'number',
            label: 'Default Volume',
            default: 1.0,
            min: 0.0,
            max: 1.0,
            step: 0.1,
            description: 'Initial volume level (0.0 to 1.0)',
          },
          {
            key: 'displayMode',
            type: 'select',
            label: 'Display Mode',
            options: [
              { value: 'overlay', label: 'Overlay on Player' },
              { value: 'section', label: 'Section below Player' },
            ],
            default: 'section',
            description: 'How to display HTML/CSS/JS content relative to the video player',
          },
          {
            key: 'sectionHeight',
            type: 'string',
            label: 'Section Height',
            default: 'auto',
            description: "Height of the section below player (e.g., 'auto', '300px', '50vh')",
          },
          {
            key: 'sectionMinHeight',
            type: 'string',
            label: 'Section Min Height',
            default: '200px',
            description: 'Minimum height of the section below player',
          },
          {
            key: 'sectionMaxHeight',
            type: 'string',
            label: 'Section Max Height',
            default: 'none',
            description:
              "Maximum height of the section below player (e.g., 'none', '500px', '80vh')",
          },
          {
            key: 'showCaptions',
            type: 'boolean',
            label: 'Show Captions',
            default: false,
            description: 'Show closed captions/subtitles if available (YouTube/Vimeo)',
          },
          {
            key: 'videoQuality',
            type: 'select',
            label: 'Video Quality',
            options: [
              { value: 'auto', label: 'Auto' },
              { value: 'hd1080', label: '1080p' },
              { value: 'hd720', label: '720p' },
              { value: 'medium', label: '480p' },
              { value: 'small', label: '360p' },
            ],
            default: 'auto',
            description: 'Preferred video quality (may be limited by provider)',
          },
        ],
      },
      sampleData: {
        message: 'Select an approved video URL (YouTube or Vimeo) in the interaction configuration.',
      },
      minConfidence: 0.7,
      teachStageFit: ['absorb-show'],
      cognitiveLoad: 'medium',
      estimatedDuration: 300,
      isActive: true,
    } as any);

    await this.interactionTypeRepository.save(videoUrl);
    console.log('[InteractionTypes] ✅ Video URL interaction type seeded successfully');
  }

  /**
   * Seed SDK Test Video URL interaction type if it doesn't exist yet.
   * This mirrors the migration 1735100001000-CreateSDKTestVideoUrlInteraction.
   */
  async seedSDKTestVideoUrlInteraction() {
    const exists = await this.interactionTypeRepository.findOne({
      where: { id: 'sdk-test-video-url' },
    });

    if (exists) {
      console.log('[InteractionTypes] ℹ️ SDK Test Video URL interaction type already exists - updating with full code');
      // Delete existing to ensure clean update
      await this.interactionTypeRepository.delete({ id: 'sdk-test-video-url' });
    }

    // HTML/CSS/JS code from migration
    const overlayHtml = `
      <div id="sdk-test-video-url-overlay">
        <div id="sdk-test-header">
          <h2>AI Teacher SDK Test - Video URL</h2>
          <p id="status-text">Initializing...</p>
        </div>
        <div id="sdk-test-buttons"></div>
        <div id="sdk-test-results"></div>
      </div>
    `;

    const overlayCss = `
      #sdk-test-video-url-overlay {
        position: relative;
        width: 100%;
        background: rgba(15, 15, 35, 0.95);
        border-top: 2px solid rgba(0, 212, 255, 0.5);
        padding: 20px;
        min-height: 200px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      #sdk-test-header {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(0, 212, 255, 0.3);
      }
      #sdk-test-header h2 {
        color: #00d4ff;
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      }
      #status-text {
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
        font-size: 13px;
      }
      #sdk-test-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
        margin-bottom: 20px;
      }
      .test-button {
        padding: 10px 16px;
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 6px;
        color: #00d4ff;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      .test-button:hover {
        background: rgba(0, 212, 255, 0.2);
        border-color: #00d4ff;
        transform: translateY(-2px);
      }
      .test-button:active {
        transform: translateY(0);
      }
      .section-label {
        grid-column: 1 / -1;
        color: #00d4ff;
        font-size: 16px;
        font-weight: bold;
        margin: 20px 0 10px 0;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      #sdk-test-results {
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
      .result-item {
        padding: 8px;
        margin: 4px 0;
        background: rgba(0, 212, 255, 0.05);
        border-left: 3px solid #00d4ff;
        border-radius: 4px;
      }
      .result-item.error {
        border-left-color: #ff4444;
        color: #ff8888;
      }
      .result-item.success {
        border-left-color: #44ff44;
        color: #88ff88;
      }
    `;

    // JavaScript code is very long - using the exact code from migration
    const overlayJs = `
      (function() {
        console.log("[SDK Test Video URL] Starting initialization...");
        
        // Include createVideoUrlAISDK function with video URL control methods
        const createVideoUrlAISDK = () => {
          let subscriptionId = null;
          let requestCounter = 0;

          const generateRequestId = () => 'req-' + Date.now() + '-' + (++requestCounter);
          const generateSubscriptionId = () => 'sub-' + Date.now() + '-' + Math.random();

          const sendMessage = (type, data, callback) => {
            const requestId = generateRequestId();
            const message = { type, requestId, ...data };

            if (callback) {
              const listener = (event) => {
                if (event.data.requestId === requestId) {
                  window.removeEventListener("message", listener);
                  callback(event.data);
                }
              };
              window.addEventListener("message", listener);
            }
            
            window.parent.postMessage(message, '*');
          };

          return {
            emitEvent: (event, processedContentId) => {
              sendMessage("ai-sdk-emit-event", { event, processedContentId });
            },
            updateState: (key, value) => {
              sendMessage("ai-sdk-update-state", { key, value });
            },
            getState: (callback) => {
              sendMessage("ai-sdk-get-state", {}, (response) => {
                callback(response.state);
              });
            },
            onResponse: (callback) => {
              subscriptionId = generateSubscriptionId();
              sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
                const listener = (event) => {
                  if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
                    callback(event.data.response);
                  }
                };
                window.addEventListener("message", listener);
                return () => {
                  window.removeEventListener("message", listener);
                  sendMessage("ai-sdk-unsubscribe", { subscriptionId });
                };
              });
            },
            isReady: (callback) => {
              const listener = (event) => {
                if (event.data.type === "ai-sdk-ready") {
                  window.removeEventListener("message", listener);
                  callback(true);
                }
              };
              window.addEventListener("message", listener);
            },
            minimizeChatUI: () => {
              sendMessage("ai-sdk-minimize-chat-ui", {});
            },
            showChatUI: () => {
              sendMessage("ai-sdk-show-chat-ui", {});
            },
            activateFullscreen: () => {
              sendMessage("ai-sdk-activate-fullscreen", {});
            },
            deactivateFullscreen: () => {
              sendMessage("ai-sdk-deactivate-fullscreen", {});
            },
            postToChat: (content, role = "assistant", openChat = false) => {
              sendMessage("ai-sdk-post-to-chat", { content, role, openChat });
            },
            showScript: (text, openChat = false) => {
              sendMessage("ai-sdk-show-script", { text, openChat });
            },
            showSnack: (content, duration, hideFromChatUI, callback) => {
              sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => {
                if (callback && response.snackId) {
                  callback(response.snackId);
                }
              });
            },
            hideSnack: () => {
              sendMessage("ai-sdk-hide-snack", {});
            },
            saveInstanceData: (data, callback) => {
              sendMessage("ai-sdk-save-instance-data", { data }, (response) => {
                if (callback) {
                  callback(response.success, response.error);
                }
              });
            },
            getInstanceDataHistory: (filters, callback) => {
              const filtersData = filters ? {
                dateFrom: filters.dateFrom?.toISOString(),
                dateTo: filters.dateTo?.toISOString(),
                limit: filters.limit,
              } : {};
              sendMessage("ai-sdk-get-instance-data-history", { filters: filtersData }, (response) => {
                if (callback) {
                  callback(response.data, response.error);
                }
              });
            },
            saveUserProgress: (data, callback) => {
              sendMessage("ai-sdk-save-user-progress", { data }, (response) => {
                if (callback) {
                  callback(response.progress, response.error);
                }
              });
            },
            getUserProgress: (callback) => {
              sendMessage("ai-sdk-get-user-progress", {}, (response) => {
                if (callback) {
                  callback(response.progress, response.error);
                }
              });
            },
            markCompleted: (callback) => {
              sendMessage("ai-sdk-mark-completed", {}, (response) => {
                if (callback) {
                  callback(response.progress, response.error);
                }
              });
            },
            incrementAttempts: (callback) => {
              sendMessage("ai-sdk-increment-attempts", {}, (response) => {
                if (callback) {
                  callback(response.progress, response.error);
                }
              });
            },
            getUserPublicProfile: (userId, callback) => {
              sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => {
                if (callback) {
                  callback(response.profile, response.error);
                }
              });
            },
            // Video URL Control Methods (different names from media player)
            playVideoUrl: (callback) => {
              sendMessage("ai-sdk-play-video-url", {}, (response) => {
                if (callback) {
                  callback(response.success, response.error);
                }
              });
            },
            pauseVideoUrl: () => {
              sendMessage("ai-sdk-pause-video-url", {});
            },
            seekVideoUrl: (time) => {
              sendMessage("ai-sdk-seek-video-url", { time });
            },
            setVideoUrlVolume: (volume) => {
              sendMessage("ai-sdk-set-video-url-volume", { volume });
            },
            getVideoUrlCurrentTime: (callback) => {
              sendMessage("ai-sdk-get-video-url-current-time", {}, (response) => {
                if (callback) {
                  callback(response.currentTime);
                }
              });
            },
            getVideoUrlDuration: (callback) => {
              sendMessage("ai-sdk-get-video-url-duration", {}, (response) => {
                if (callback) {
                  callback(response.duration);
                }
              });
            },
            isVideoUrlPlaying: (callback) => {
              sendMessage("ai-sdk-is-video-url-playing", {}, (response) => {
                if (callback) {
                  callback(response.isPlaying);
                }
              });
            },
            showOverlayHtml: () => {
              sendMessage("ai-sdk-show-overlay-html", {});
            },
            hideOverlayHtml: () => {
              sendMessage("ai-sdk-hide-overlay-html", {});
            },
          };
        };

        let aiSDK = null;
        let statusText = null;
        let buttonsContainer = null;
        let resultsContainer = null;

        function updateStatus(message, color = "#ffffff") {
          if (statusText) {
            statusText.textContent = message;
            statusText.style.color = color;
          }
          console.log("[SDK Test Video URL]", message);
        }

        function addResult(message, type = "info") {
          if (!resultsContainer) return;
          const resultItem = document.createElement("div");
          resultItem.className = "result-item " + type;
          resultItem.textContent = new Date().toLocaleTimeString() + ": " + message;
          resultsContainer.appendChild(resultItem);
          resultsContainer.scrollTop = resultsContainer.scrollHeight;
        }

        function createButton(text, onClick) {
          const button = document.createElement("button");
          button.className = "test-button";
          button.textContent = text;
          button.onclick = () => {
            try {
              onClick();
            } catch (error) {
              addResult("Error: " + error.message, "error");
            }
          };
          if (buttonsContainer) {
            buttonsContainer.appendChild(button);
          }
          return button;
        }

        function createSectionLabel(text) {
          const label = document.createElement("div");
          label.className = "section-label";
          label.textContent = text;
          if (buttonsContainer) {
            buttonsContainer.appendChild(label);
          }
          return label;
        }

        function initTestApp() {
          console.log("[SDK Test Video URL] Initializing app...");
          
          buttonsContainer = document.getElementById("sdk-test-buttons");
          statusText = document.getElementById("status-text");
          resultsContainer = document.getElementById("sdk-test-results");
          
          if (!buttonsContainer || !statusText) {
            console.error("[SDK Test Video URL] Required elements not found!");
            return;
          }

          // Use existing SDK if available (created by lesson view), otherwise create our own
          if (window.aiSDK && typeof window.aiSDK.playVideoUrl === 'function') {
            // SDK already exists from lesson view - use it
            aiSDK = window.aiSDK;
            console.log('[SDK Test Video URL] Using existing SDK from lesson view');
          } else {
            // Create our own SDK (for preview mode or if SDK not available)
            aiSDK = createVideoUrlAISDK();
            console.log('[SDK Test Video URL] Created own SDK');
          }
          
          // Check if we're in lesson view (not preview mode)
          // In lesson view, section content is in same document, so window.parent === window
          // But we can check for __isLessonView marker or if SDK methods actually work
          const isPreviewMode = (!window.__isLessonView && (!window.aiSDK || typeof window.aiSDK.playVideoUrl !== 'function')) || 
                                (window.parent && window.parent !== window && !window.aiSDK);
          
          if (isPreviewMode) {
            updateStatus("Preview Mode - SDK will work when added to a lesson", "#ffff00");
          } else {
            updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", "#ffff00");
            
            aiSDK.isReady((ready) => {
              if (ready) {
                updateStatus("SDK Ready! All methods available.", "#00ff00");
                addResult("SDK initialized successfully", "success");
              }
            });
          }

          // Core Methods
          createSectionLabel("CORE METHODS");
          createButton("Emit Event", () => {
            aiSDK.emitEvent({
              type: "user-selection",
              data: { test: true, timestamp: Date.now() },
              requiresLLMResponse: true,
            });
            addResult("Event emitted", "success");
          });

          createButton("Update State", () => {
            aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
            addResult("State updated", "success");
          });

          createButton("Get State", () => {
            aiSDK.getState((state) => {
              addResult("State: " + JSON.stringify(state).substring(0, 50), "info");
            });
          });

          // UI Control Methods
          createSectionLabel("UI CONTROL METHODS");
          createButton("Minimize Chat UI", () => {
            aiSDK.minimizeChatUI();
            addResult("Chat UI minimized", "success");
          });

          createButton("Show Chat UI", () => {
            aiSDK.showChatUI();
            addResult("Chat UI shown", "success");
          });

          createButton("Activate Fullscreen", () => {
            aiSDK.activateFullscreen();
            addResult("Fullscreen activated", "success");
          });

          createButton("Deactivate Fullscreen", () => {
            aiSDK.deactivateFullscreen();
            addResult("Fullscreen deactivated", "success");
          });

          createButton("Post to Chat", () => {
            const testMessage = "Test message from Video URL SDK Test!";
            aiSDK.postToChat(testMessage, "assistant", true);
            addResult("Posted to chat", "success");
          });

          createButton("Show Script", () => {
            const testScript = "This is a test script block from the Video URL SDK Test.";
            aiSDK.showScript(testScript, true);
            addResult("Script shown", "success");
          });

          createButton("Show Snack (5s)", () => {
            aiSDK.showSnack("Test snack message! (also posts to chat)", 5000, false, (snackId) => {
              addResult("Snack shown: " + snackId, "success");
            });
          });

          createButton("Show Snack (no chat)", () => {
            aiSDK.showSnack("Test snack (hidden from chat)", 5000, true, (snackId) => {
              addResult("Snack shown (no chat): " + snackId, "success");
            });
          });

          createButton("Hide Snack", () => {
            aiSDK.hideSnack();
            addResult("Snack hidden", "success");
          });

          // Video URL Control Methods
          createSectionLabel("VIDEO URL CONTROL METHODS");
          createButton("Play Video", () => {
            aiSDK.playVideoUrl((success, error) => {
              if (success) {
                addResult("Video play requested", "success");
              } else {
                addResult("Error: " + error, "error");
              }
            });
          });

          createButton("Pause Video", () => {
            aiSDK.pauseVideoUrl();
            addResult("Video pause requested", "success");
          });

          createButton("Seek to 30s", () => {
            aiSDK.seekVideoUrl(30);
            addResult("Seek to 30 seconds", "success");
          });

          createButton("Seek to 60s", () => {
            aiSDK.seekVideoUrl(60);
            addResult("Seek to 60 seconds", "success");
          });

          createButton("Set Volume 50%", () => {
            aiSDK.setVideoUrlVolume(0.5);
            addResult("Volume set to 50%", "success");
          });

          createButton("Set Volume 100%", () => {
            aiSDK.setVideoUrlVolume(1.0);
            addResult("Volume set to 100%", "success");
          });

          createButton("Get Current Time", () => {
            aiSDK.getVideoUrlCurrentTime((time) => {
              addResult("Current time: " + time.toFixed(2) + "s", "info");
            });
          });

          createButton("Get Duration", () => {
            aiSDK.getVideoUrlDuration((duration) => {
              addResult("Duration: " + duration.toFixed(2) + "s", "info");
            });
          });

          createButton("Is Playing?", () => {
            aiSDK.isVideoUrlPlaying((isPlaying) => {
              addResult("Is playing: " + isPlaying, "info");
            });
          });

          createButton("Show Overlay HTML", () => {
            aiSDK.showOverlayHtml();
            addResult("Show overlay HTML requested", "success");
          });

          createButton("Hide Overlay HTML", () => {
            aiSDK.hideOverlayHtml();
            addResult("Hide overlay HTML requested", "success");
          });

          // Data Storage Methods
          createSectionLabel("DATA STORAGE METHODS");
          createButton("Save Instance Data", () => {
            aiSDK.saveInstanceData(
              {
                testValue: Math.random(),
                timestamp: Date.now(),
                testArray: [1, 2, 3],
              },
              (success, error) => {
                if (success) {
                  addResult("Instance data saved", "success");
                } else {
                  addResult("Error: " + error, "error");
                }
              }
            );
          });

          createButton("Get Instance History", () => {
            aiSDK.getInstanceDataHistory(
              { limit: 10 },
              (data, error) => {
                if (data) {
                  addResult("History: " + data.length + " records", "success");
                } else {
                  addResult("Error: " + error, "error");
                }
              }
            );
          });

          createButton("Save User Progress", () => {
            aiSDK.saveUserProgress(
              {
                score: Math.floor(Math.random() * 100),
                completed: false,
                customData: {
                  testField: "test value",
                  testNumber: 42,
                },
              },
              (progress, error) => {
                if (progress) {
                  addResult("Progress saved. Attempts: " + progress.attempts, "success");
                } else {
                  addResult("Error: " + error, "error");
                }
              }
            );
          });

          createButton("Get User Progress", () => {
            aiSDK.getUserProgress((progress, error) => {
              if (progress) {
                addResult("Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed, "success");
              } else if (error) {
                addResult("Error: " + error, "error");
              } else {
                addResult("No progress found", "info");
              }
            });
          });

          createButton("Mark Completed", () => {
            aiSDK.markCompleted((progress, error) => {
              if (progress) {
                addResult("Marked as completed", "success");
              } else {
                addResult("Error: " + error, "error");
              }
            });
          });

          createButton("Increment Attempts", () => {
            aiSDK.incrementAttempts((progress, error) => {
              if (progress) {
                addResult("Attempts: " + progress.attempts, "success");
              } else {
                addResult("Error: " + error, "error");
              }
            });
          });

          console.log("[SDK Test Video URL] All buttons created");
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initTestApp);
        } else {
          setTimeout(initTestApp, 10);
        }
      })();
    `;

    const sdkTest = this.interactionTypeRepository.create({
      id: 'sdk-test-video-url',
      name: 'SDK Test - Video URL',
      category: 'absorb-show',
      description:
        'Comprehensive test interaction for all AI Teacher SDK functionality including video URL control methods. This interaction displays test buttons in a section below the video URL player.',
      schema: {},
      generationPrompt:
        'This is a test interaction for SDK functionality with video URL control methods.',
      interactionTypeCategory: 'video-url',
      htmlCode: overlayHtml,
      cssCode: overlayCss,
      jsCode: overlayJs,
      configSchema: {
        fields: [
          {
            key: 'goFullscreenOnLoad',
            type: 'boolean',
            label: 'Go to fullscreen on load',
            default: false,
            description: 'Automatically activate fullscreen mode when the interaction loads'
          },
          {
            key: 'showAiTeacherUiOnLoad',
            type: 'boolean',
            label: 'Show AI Teacher UI on load',
            default: false,
            description: 'Automatically show the AI Teacher UI when the interaction loads. If false (default), the UI will remain minimized.',
          },
          {
            key: 'playVideoOnLoad',
            type: 'boolean',
            label: 'Play video on load',
            default: false,
            description: 'Automatically start video playback when the interaction loads',
          },
        ],
      },
      sampleData: {
        message:
          'This is a test interaction. Select an approved video URL (YouTube or Vimeo) in the interaction configuration.',
      },
      instanceDataSchema: {
        fields: [
          {
            name: 'testValue',
            type: 'number',
            required: false,
            description: 'Test numeric value',
          },
          {
            name: 'timestamp',
            type: 'number',
            required: false,
            description: 'Timestamp of test',
          },
          {
            name: 'testArray',
            type: 'array',
            required: false,
            description: 'Test array',
          },
        ],
      },
      userProgressSchema: {
        customFields: [
          {
            name: 'testField',
            type: 'string',
            required: false,
            description: 'Test string field',
          },
          {
            name: 'testNumber',
            type: 'number',
            required: false,
            description: 'Test number field',
          },
        ],
      },
      isActive: true,
    } as any);

    await this.interactionTypeRepository.save(sdkTest);
    console.log('[InteractionTypes] ✅ SDK Test Video URL interaction type seeded successfully');
  }

  /**
   * Update SDK Test PixiJS interaction with latest code including image generation
   */
  async updateSDKTestPixiJSInteraction() {
    // Embed the full code directly (since file may not be accessible in Docker)
    // This code includes image generation functionality
    const jsCode = `// SDK Test PixiJS Interaction
// Tests all AI Teacher SDK functionality including image generation

// Load PixiJS from CDN and initialize
(function() {
  console.log("[SDK Test] Starting initialization...");
  
  if (window.PIXI) {
    console.log("[SDK Test] PixiJS already loaded");
    setTimeout(initTestApp, 10);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js";
    script.onload = () => {
      console.log("[SDK Test] PixiJS loaded successfully");
      setTimeout(initTestApp, 10);
    };
    script.onerror = () => {
      console.error("[SDK Test] Failed to load PixiJS from CDN");
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText = "padding: 20px; color: red; background: #1a1a1a;";
      errorDiv.textContent = "Error: Failed to load PixiJS library";
      document.body.appendChild(errorDiv);
    };
    document.head.appendChild(script);
  }
})();

const createIframeAISDK = () => {
  let subscriptionId = null;
  let requestCounter = 0;
  let currentLessonId = null; // Store lesson ID from ready message
  let currentAccountId = null; // Store account ID from ready message
  const generateRequestId = () => 'req-' + Date.now() + '-' + (++requestCounter);
  const generateSubscriptionId = () => 'sub-' + Date.now() + '-' + Math.random();
  const sendMessage = (type, data, callback) => {
    const requestId = generateRequestId();
    const message = { type, requestId, ...data };
    if (callback) {
      const listener = (event) => {
        if (event.data.requestId === requestId) {
          window.removeEventListener("message", listener);
          callback(event.data);
        }
      };
      window.addEventListener("message", listener);
    }
    window.parent.postMessage(message, '*');
  };
  
  // Listen for SDK ready message to store lesson ID and account ID
  window.addEventListener("message", (event) => {
    if (event.data.type === "ai-sdk-ready") {
      if (event.data.lessonId) {
        currentLessonId = event.data.lessonId;
        console.log("[SDK Test] SDK ready, lesson ID:", currentLessonId);
      }
      if (event.data.accountId) {
        currentAccountId = event.data.accountId;
        console.log("[SDK Test] SDK ready, account ID:", currentAccountId);
      }
    }
  });
  
  // HTML/PixiJS Layering Utilities
  // Store input-button pairs for dynamic repositioning on resize
  const inputButtonPairs = [];
  
  // Helper function to position HTML input beside a PixiJS button
  // This follows the HTML/PixiJS layering strategy: inputs positioned beside buttons, not on top
  function positionInputBesideButton(inputElement, buttonContainer, offsetX = 0, offsetY = 0, buttonWidth = 150) {
    if (!inputElement || !buttonContainer) {
      console.warn("[SDK Test] positionInputBesideButton: Missing inputElement or buttonContainer", {
        hasInput: !!inputElement,
        hasButton: !!buttonContainer
      });
      return;
    }
    
    // Get button's actual screen position using getBoundingClientRect on the canvas
    // We need to convert PixiJS coordinates to screen coordinates
    const canvas = inputElement.ownerDocument.querySelector('canvas');
    if (!canvas) {
      console.error("[SDK Test] Canvas not found for positioning");
      return;
    }
    
    const canvasRect = canvas.getBoundingClientRect();
    let buttonScreenX, buttonScreenY;
    
    const viewport = inputElement.ownerDocument.defaultView;
    const viewportHeight = viewport ? viewport.innerHeight : 600;
    const viewportWidth = viewport ? viewport.innerWidth : 800;
    
    // Get scroll offsets if canvas is inside a scrollable container
    const scrollX = viewport ? (viewport.pageXOffset || viewport.scrollX || 0) : 0;
    const scrollY = viewport ? (viewport.pageYOffset || viewport.scrollY || 0) : 0;
    
    if (buttonContainer.getGlobalPosition) {
      // getGlobalPosition returns coordinates relative to the canvas
      const globalPos = buttonContainer.getGlobalPosition();
      // Convert canvas coordinates to screen coordinates (getBoundingClientRect already accounts for scroll)
      buttonScreenX = canvasRect.left + globalPos.x;
      buttonScreenY = canvasRect.top + globalPos.y;
      console.log("[SDK Test] Using getGlobalPosition - button canvas pos:", globalPos.x, globalPos.y, "screen pos:", buttonScreenX, buttonScreenY, "scroll:", scrollX, scrollY);
    } else {
      // Fallback: use buttonY property set by createButton
      const buttonCanvasX = buttonContainer.x + (buttonContainer.buttonX || 0);
      const buttonCanvasY = buttonContainer.y + (buttonContainer.buttonY || 0);
      // Convert canvas coordinates to screen coordinates
      buttonScreenX = canvasRect.left + buttonCanvasX;
      buttonScreenY = canvasRect.top + buttonCanvasY;
      console.log("[SDK Test] Using relative positioning - button canvas pos:", buttonCanvasX, buttonCanvasY, "screen pos:", buttonScreenX, buttonScreenY, "scroll:", scrollX, scrollY);
    }
    
    // Check if button is visible in viewport
    const buttonVisible = buttonScreenY >= 0 && buttonScreenY <= viewportHeight;
    
    // Position input to the right of button (button width + spacing)
    let inputX = buttonScreenX + buttonWidth + 10 + offsetX;
    let inputY = buttonScreenY + offsetY;
    
    // If button is not visible, position input at a visible location (top of viewport)
    if (!buttonVisible) {
      console.log("[SDK Test] ⚠️ Button not visible in viewport (y=" + buttonScreenY + "), positioning input at top of viewport");
      inputY = 20 + offsetY; // Position near top of viewport
      // Keep X position relative to button if button is horizontally visible
      if (buttonScreenX < 0 || buttonScreenX > viewportWidth) {
        inputX = 20 + buttonWidth + 10 + offsetX; // Default position
      }
    }
    
    console.log("[SDK Test] Positioning input:", {
      inputId: inputElement.id,
      buttonX: buttonScreenX,
      buttonY: buttonScreenY,
      canvasRectY: canvasRect.y,
      calculatedInputX: inputX,
      calculatedInputY: inputY,
      buttonWidth: buttonWidth,
      viewportHeight: inputElement.ownerDocument.defaultView.innerHeight
    });
    
    // Use absolute positioning - fixed doesn't work well inside iframes
    // The coordinates are already converted to screen coordinates via canvas.getBoundingClientRect()
    // Use position: fixed to keep inputs aligned with viewport during scroll
    // This matches getBoundingClientRect() coordinates which are viewport-relative
    inputElement.style.position = "fixed";
    inputElement.style.left = inputX + "px";
    inputElement.style.top = inputY + "px";
    inputElement.style.zIndex = "1000"; // Ensure it's above PixiJS canvas
    inputElement.style.visibility = "visible"; // Make visible once positioned
    
    console.log("[SDK Test] ✅ Positioned input:", inputElement.id, "at screen coordinates", inputX, inputY);
    
    // Store the pair for resize handling
    inputButtonPairs.push({
      input: inputElement,
      button: buttonContainer,
      offsetX: offsetX,
      offsetY: offsetY,
      buttonWidth: buttonWidth
    });
  }
  
  // Function to reposition all inputs when canvas/window resizes
  // This is called continuously by the requestAnimationFrame loop
  function repositionAllInputs() {
    if (inputButtonPairs.length === 0) {
      return; // No inputs to position
    }
    
    inputButtonPairs.forEach(pair => {
      if (!pair.input || !pair.button) {
        return; // Skip invalid pairs
      }
      
      // Check if elements still exist in DOM
      if (!pair.input.isConnected || !document.body.contains(pair.input)) {
        return; // Input removed from DOM
      }
      
      // Get canvas element to convert canvas coordinates to screen coordinates
      const canvas = pair.input.ownerDocument.querySelector('canvas');
      if (!canvas) {
        console.warn("[SDK Test] Canvas not found for repositioning input:", pair.input.id);
        return;
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      
      // Get viewport and scroll offsets for proper positioning during scroll
      const viewport = pair.input.ownerDocument.defaultView;
      const scrollX = viewport ? (viewport.pageXOffset || viewport.scrollX || 0) : 0;
      const scrollY = viewport ? (viewport.pageYOffset || viewport.scrollY || 0) : 0;
      
      // Get button position in canvas coordinates
      let buttonCanvasX, buttonCanvasY;
      try {
        if (pair.button.getGlobalPosition) {
          const globalPos = pair.button.getGlobalPosition();
          buttonCanvasX = globalPos.x;
          buttonCanvasY = globalPos.y;
        } else {
          // Fallback to relative positioning
          buttonCanvasX = (pair.button.x || 0) + (pair.button.buttonX || 0);
          buttonCanvasY = (pair.button.y || 0) + (pair.button.buttonY || 0);
        }
      } catch (e) {
        console.warn("[SDK Test] Error getting button position:", e);
        return; // Skip this pair if we can't get button position
      }
      
      // Convert canvas coordinates to screen coordinates
      // getBoundingClientRect() already accounts for scroll, so we use it directly
      // But we need to ensure inputs use fixed positioning relative to viewport during scroll
      const buttonScreenX = canvasRect.left + buttonCanvasX;
      const buttonScreenY = canvasRect.top + buttonCanvasY;
      
      // Calculate input position
      const inputX = buttonScreenX + pair.buttonWidth + 10 + pair.offsetX;
      const inputY = buttonScreenY + pair.offsetY;
      
      // Only update if position has changed (avoid unnecessary DOM updates)
      const currentLeft = parseFloat(pair.input.style.left) || 0;
      const currentTop = parseFloat(pair.input.style.top) || 0;
      const threshold = 1; // Only update if change is more than 1px
      
      if (Math.abs(currentLeft - inputX) > threshold || Math.abs(currentTop - inputY) > threshold) {
        // Use position: fixed to keep inputs aligned with viewport during scroll
        // This matches getBoundingClientRect() coordinates which are viewport-relative
        pair.input.style.position = "fixed";
        pair.input.style.left = inputX + "px";
        pair.input.style.top = inputY + "px";
        pair.input.style.zIndex = "1000";
        pair.input.style.visibility = "visible";
        pair.input.style.display = "block";
      }
    });
  }
  
  // Robust positioning system using requestAnimationFrame
  let positioningAnimationFrameId = null;
  let lastRepositionTime = 0;
  const REPOSITION_THROTTLE_MS = 16; // ~60fps max update rate
  
  // Continuous positioning loop using requestAnimationFrame
  function startPositioningLoop() {
    if (positioningAnimationFrameId !== null) {
      return; // Already running
    }
    
    function updatePositions() {
      const now = Date.now();
      // Throttle updates to prevent excessive work
      if (now - lastRepositionTime >= REPOSITION_THROTTLE_MS) {
        repositionAllInputs();
        lastRepositionTime = now;
      }
      positioningAnimationFrameId = requestAnimationFrame(updatePositions);
    }
    
    positioningAnimationFrameId = requestAnimationFrame(updatePositions);
    console.log("[SDK Test] ✅ Started continuous positioning loop");
  }
  
  function stopPositioningLoop() {
    if (positioningAnimationFrameId !== null) {
      cancelAnimationFrame(positioningAnimationFrameId);
      positioningAnimationFrameId = null;
      console.log("[SDK Test] ⏹️ Stopped continuous positioning loop");
    }
  }
  
  // Set up resize listeners (only once)
  let resizeListenersSetup = false;
  function setupResizeListeners() {
    if (resizeListenersSetup) return;
    resizeListenersSetup = true;
    
    // Listen for window resize
    window.addEventListener("resize", () => {
      repositionAllInputs();
    });
    
    // Listen for scroll events (in case canvas is in a scrollable container)
    window.addEventListener("scroll", () => {
      repositionAllInputs();
    }, true); // Use capture phase to catch all scroll events
    
    // Note: PixiJS renderer resize listener will be set up in the interaction code
    // where the app instance is available
  }
  setupResizeListeners();
  
  // Note: startPositioningLoop() will be called after aiSDK is created in initTestApp()
  
  // HTML/PixiJS Coordinate Transformation System
  // Store attached HTML elements for automatic repositioning
  const attachedHtmlElements = [];
  
  // Convert PixiJS world coordinates to HTML screen coordinates
  // This properly accounts for canvas position, scroll, and viewport
  function convertPixiToScreen(pixiX, pixiY, pixiContainer) {
    if (!pixiContainer) {
      console.warn('[SDK] convertPixiToScreen: pixiContainer is required');
      return { x: pixiX, y: pixiY };
    }
    
    // Get the canvas element
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('[SDK] convertPixiToScreen: canvas not found');
      return { x: pixiX, y: pixiY };
    }
    
    // Get the pixi-container element to account for scroll
    const pixiContainerElement = document.getElementById('pixi-container');
    const scrollX = pixiContainerElement ? pixiContainerElement.scrollLeft || 0 : 0;
    const scrollY = pixiContainerElement ? pixiContainerElement.scrollTop || 0 : 0;
    
    // Get the global position of the container (in canvas coordinates)
    const globalPos = pixiContainer.getGlobalPosition();
    
    // Get canvas bounding rect (accounts for viewport position)
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get pixi-container bounding rect to calculate relative position
    const containerRect = pixiContainerElement ? pixiContainerElement.getBoundingClientRect() : null;
    
    // Convert canvas coordinates to screen coordinates
    // For position: absolute within a scrolling container, positions are relative to the container's content
    // The canvas is positioned within pixi-container, so we need: canvas offset in container + globalPos + local offset
    // Note: We DON'T subtract scroll because absolute positioning within a scrolling container
    // automatically accounts for scroll - the browser handles it
    if (containerRect) {
      // Calculate canvas position relative to pixi-container's content area (not viewport)
      // canvasRect is viewport-relative, containerRect is viewport-relative
      // We need the canvas position in the container's coordinate system
      const canvasOffsetX = canvasRect.left - containerRect.left + scrollX;
      const canvasOffsetY = canvasRect.top - containerRect.top + scrollY;
      
      // Position relative to pixi-container's content area
      const relativeX = canvasOffsetX + globalPos.x + pixiX;
      const relativeY = canvasOffsetY + globalPos.y + pixiY;
      return { x: relativeX, y: relativeY };
    } else {
      // Fallback to viewport coordinates if container not found
      const screenX = canvasRect.left + globalPos.x + pixiX;
      const screenY = canvasRect.top + globalPos.y + pixiY;
      return { x: screenX, y: screenY };
    }
  }
  
  // Convert HTML screen coordinates to PixiJS world coordinates
  function convertScreenToPixi(screenX, screenY, pixiContainer) {
    if (!pixiContainer) {
      console.warn('[SDK] convertScreenToPixi: pixiContainer is required');
      return { x: screenX, y: screenY };
    }
    
    // Get the global position of the container
    const globalPos = pixiContainer.getGlobalPosition();
    
    // Convert screen coordinates to local container coordinates
    return {
      x: screenX - globalPos.x,
      y: screenY - globalPos.y
    };
  }
  
  // Get current view transform (scale, position, rotation)
  function getViewTransform(pixiContainer) {
    if (!pixiContainer) {
      return { scale: { x: 1, y: 1 }, x: 0, y: 0, rotation: 0 };
    }
    
    return {
      scale: { x: pixiContainer.scale.x, y: pixiContainer.scale.y },
      x: pixiContainer.x,
      y: pixiContainer.y,
      rotation: pixiContainer.rotation,
      pivot: { x: pixiContainer.pivot.x, y: pixiContainer.pivot.y }
    };
  }
  
  // Attach HTML element to a PixiJS container/sprite
  function attachHtmlToPixiElement(htmlElement, pixiContainer, options = {}) {
    if (!htmlElement || !pixiContainer) {
      console.warn('[SDK] attachHtmlToPixiElement: htmlElement and pixiContainer are required');
      return;
    }
    
    const {
      offsetX = 0,
      offsetY = 0,
      anchor = 'center', // 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'
      updateOnTransform = true,
      zIndex = 1000
    } = options;
    
    // Set initial z-index
    htmlElement.style.zIndex = zIndex;
    htmlElement.style.position = 'absolute';
    
    // Calculate anchor offset
    let anchorOffsetX = 0;
    let anchorOffsetY = 0;
    
    if (pixiContainer.width && pixiContainer.height) {
      const width = pixiContainer.width;
      const height = pixiContainer.height;
      
      switch (anchor) {
        case 'top-left':
          anchorOffsetX = 0;
          anchorOffsetY = 0;
          break;
        case 'top-right':
          anchorOffsetX = width;
          anchorOffsetY = 0;
          break;
        case 'bottom-left':
          anchorOffsetX = 0;
          anchorOffsetY = height;
          break;
        case 'bottom-right':
          anchorOffsetX = width;
          anchorOffsetY = height;
          break;
        case 'top':
          anchorOffsetX = width / 2;
          anchorOffsetY = 0;
          break;
        case 'bottom':
          anchorOffsetX = width / 2;
          anchorOffsetY = height;
          break;
        case 'left':
          anchorOffsetX = 0;
          anchorOffsetY = height / 2;
          break;
        case 'right':
          anchorOffsetX = width;
          anchorOffsetY = height / 2;
          break;
        case 'center':
        default:
          anchorOffsetX = width / 2;
          anchorOffsetY = height / 2;
          break;
      }
    }
    
    // Store attachment info
    const attachment = {
      htmlElement: htmlElement,
      pixiContainer: pixiContainer,
      offsetX: offsetX,
      offsetY: offsetY,
      anchorOffsetX: anchorOffsetX,
      anchorOffsetY: anchorOffsetY,
      updateOnTransform: updateOnTransform,
      zIndex: zIndex
    };
    
    attachedHtmlElements.push(attachment);
    
    // Initial positioning
    updateHtmlElementPosition(attachment);
    
    return attachment;
  }
  
  // Update position of a single attached HTML element
  function updateHtmlElementPosition(attachment) {
    if (!attachment || !attachment.htmlElement || !attachment.pixiContainer) return;
    
    // Check if HTML element is still in DOM
    if (!attachment.htmlElement.isConnected) {
      return; // Element removed from DOM
    }
    
    const screenPos = convertPixiToScreen(
      attachment.anchorOffsetX + attachment.offsetX,
      attachment.anchorOffsetY + attachment.offsetY,
      attachment.pixiContainer
    );
    
    // Use absolute positioning relative to pixi-container so elements scroll with content
    // The convertPixiToScreen function calculates position relative to pixi-container
    const pixiContainerElement = document.getElementById('pixi-container');
    if (pixiContainerElement) {
      // Ensure pixi-container has position: relative for absolute positioning to work
      if (window.getComputedStyle(pixiContainerElement).position === 'static') {
        pixiContainerElement.style.position = 'relative';
      }
      
      // Ensure the element is a child of pixi-container for proper scrolling
      if (attachment.htmlElement.parentElement !== pixiContainerElement) {
        pixiContainerElement.appendChild(attachment.htmlElement);
      }
      attachment.htmlElement.style.position = 'absolute';
      attachment.htmlElement.style.left = screenPos.x + 'px';
      attachment.htmlElement.style.top = screenPos.y + 'px';
    } else {
      // Fallback to fixed positioning if container not found
      attachment.htmlElement.style.position = 'fixed';
      attachment.htmlElement.style.left = screenPos.x + 'px';
      attachment.htmlElement.style.top = screenPos.y + 'px';
    }
    attachment.htmlElement.style.zIndex = attachment.zIndex || 1000;
    attachment.htmlElement.style.visibility = 'visible';
    attachment.htmlElement.style.display = 'block';
  }
  
  // Update all attached HTML elements
  function updateAllAttachedHtml() {
    attachedHtmlElements.forEach(attachment => {
      // Always update if updateOnTransform is true (default), or if explicitly set
      if (attachment.updateOnTransform !== false) {
        updateHtmlElementPosition(attachment);
      }
    });
  }
  
  // Start automatic update loop for attached HTML elements
  let htmlUpdateAnimationFrameId = null;
  function startHtmlUpdateLoop() {
    if (htmlUpdateAnimationFrameId !== null) {
      return; // Already running
    }
    
    function updateLoop() {
      updateAllAttachedHtml();
      htmlUpdateAnimationFrameId = requestAnimationFrame(updateLoop);
    }
    
    htmlUpdateAnimationFrameId = requestAnimationFrame(updateLoop);
    console.log('[SDK] Started HTML element update loop for container-based positioning');
  }
  
  function stopHtmlUpdateLoop() {
    if (htmlUpdateAnimationFrameId !== null) {
      cancelAnimationFrame(htmlUpdateAnimationFrameId);
      htmlUpdateAnimationFrameId = null;
    }
  }
  
  
  // Detach HTML element from PixiJS element
  function detachHtmlFromPixiElement(htmlElement) {
    const index = attachedHtmlElements.findIndex(att => att.htmlElement === htmlElement);
    if (index !== -1) {
      attachedHtmlElements.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // Attach HTML input to specific coordinates on image (in image space, not screen space)
  function attachInputToImageArea(inputElement, imageSprite, options = {}) {
    if (!inputElement || !imageSprite) {
      console.warn('[SDK] attachInputToImageArea: inputElement and imageSprite are required');
      return;
    }
    
    const {
      imageX = 0, // Coordinates in image space
      imageY = 0,
      offsetX = 0,
      offsetY = -30, // Negative to place above
      anchor = 'center',
      updateOnZoom = true,
      updateOnPan = true
    } = options;
    
    // Create a temporary container at the image coordinates
    const tempContainer = new PIXI.Container();
    tempContainer.x = imageX;
    tempContainer.y = imageY;
    
    // Add temp container to image sprite's parent at image's position
    if (imageSprite.parent) {
      imageSprite.parent.addChild(tempContainer);
      // Position relative to image sprite
      tempContainer.x = imageSprite.x + imageX;
      tempContainer.y = imageSprite.y + imageY;
    } else {
      console.warn('[SDK] attachInputToImageArea: imageSprite must be added to stage first');
      return;
    }
    
    // Use the standard attachHtmlToPixiElement with the temp container
    return attachHtmlToPixiElement(inputElement, tempContainer, {
      offsetX: offsetX,
      offsetY: offsetY,
      anchor: anchor,
      updateOnTransform: updateOnZoom || updateOnPan
    });
  }
  
  // Zoom/Pan Management
  const zoomPanInstances = new Map();
  
  function setupZoomPan(pixiContainer, options = {}) {
    if (!pixiContainer) {
      console.warn('[SDK] setupZoomPan: pixiContainer is required');
      return null;
    }
    
    const {
      minZoom = 0.5,
      maxZoom = 3.0,
      initialZoom = 1.0,
      enablePinchZoom = true,
      enableWheelZoom = true,
      enableDrag = true,
      showZoomControls = true,
      zoomControlPosition = 'top-right',
      onZoomChange = null,
      onPanChange = null
    } = options;
    
    const instanceId = 'zoomPan_' + Date.now() + '_' + Math.random();
    let currentZoom = initialZoom;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let lastPan = { x: pixiContainer.x || 0, y: pixiContainer.y || 0 };
    let lastPinchDistance = 0;
    let touchStartPositions = [];
    
    // Initialize container
    pixiContainer.scale.set(initialZoom);
    pixiContainer.pivot.set(0, 0);
    
    // Create zoom controls UI if requested
    let zoomControlsContainer = null;
    if (showZoomControls) {
      zoomControlsContainer = document.createElement('div');
      zoomControlsContainer.id = 'zoom-controls-' + instanceId;
      zoomControlsContainer.style.position = 'absolute';
      zoomControlsContainer.style.zIndex = '1001';
      zoomControlsContainer.style.padding = '10px';
      zoomControlsContainer.style.background = 'rgba(15, 15, 35, 0.9)';
      zoomControlsContainer.style.borderRadius = '4px';
      zoomControlsContainer.style.border = '2px solid #00d4ff';
      
      // Position controls
      if (zoomControlPosition.includes('top')) {
        zoomControlsContainer.style.top = '20px';
      } else {
        zoomControlsContainer.style.bottom = '20px';
      }
      if (zoomControlPosition.includes('right')) {
        zoomControlsContainer.style.right = '20px';
      } else {
        zoomControlsContainer.style.left = '20px';
      }
      
      // Zoom in button
      const zoomInBtn = document.createElement('button');
      zoomInBtn.textContent = '+';
      zoomInBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 18px;';
      zoomInBtn.onclick = () => setZoom(currentZoom * 1.2);
      
      // Zoom out button
      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.textContent = '−';
      zoomOutBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 18px;';
      zoomOutBtn.onclick = () => setZoom(currentZoom / 1.2);
      
      // Reset button
      const resetBtn = document.createElement('button');
      resetBtn.textContent = '⌂';
      resetBtn.style.cssText = 'width: 30px; height: 30px; margin: 2px; background: #00d4ff; border: none; border-radius: 4px; color: #0f0f23; cursor: pointer; font-size: 14px;';
      resetBtn.onclick = resetView;
      
      zoomControlsContainer.appendChild(zoomInBtn);
      zoomControlsContainer.appendChild(zoomOutBtn);
      zoomControlsContainer.appendChild(resetBtn);
      document.body.appendChild(zoomControlsContainer);
    }
    
    // Set zoom level
    function setZoom(zoom, centerX = null, centerY = null) {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      
      if (centerX === null || centerY === null) {
        // Center on container's current center
        centerX = pixiContainer.width / 2;
        centerY = pixiContainer.height / 2;
      }
      
      // Get current world position of center point
      const worldPos = convertPixiToScreen(centerX, centerY, pixiContainer);
      
      // Update zoom
      currentZoom = newZoom;
      pixiContainer.scale.set(currentZoom);
      
      // Adjust position to keep center point in same screen position
      const newWorldPos = convertPixiToScreen(centerX, centerY, pixiContainer);
      pixiContainer.x += worldPos.x - newWorldPos.x;
      pixiContainer.y += worldPos.y - newWorldPos.y;
      
      lastPan = { x: pixiContainer.x, y: pixiContainer.y };
      
      // Update attached HTML elements
      updateAllAttachedHtml();
      
      if (onZoomChange) onZoomChange(currentZoom);
    }
    
    // Set pan position
    function setPan(x, y) {
      pixiContainer.x = x;
      pixiContainer.y = y;
      lastPan = { x: x, y: y };
      
      // Update attached HTML elements
      updateAllAttachedHtml();
      
      if (onPanChange) onPanChange(x, y);
    }
    
    // Reset view
    function resetView() {
      currentZoom = initialZoom;
      pixiContainer.scale.set(initialZoom);
      pixiContainer.x = 0;
      pixiContainer.y = 0;
      lastPan = { x: 0, y: 0 };
      
      // Update attached HTML elements
      updateAllAttachedHtml();
      
      if (onZoomChange) onZoomChange(currentZoom);
      if (onPanChange) onPanChange(0, 0);
    }
    
    // Mouse wheel zoom
    if (enableWheelZoom) {
      const canvas = pixiContainer.parent?.canvas || document;
      const wheelHandler = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(currentZoom * delta, centerX, centerY);
      };
      
      if (canvas.addEventListener) {
        canvas.addEventListener('wheel', wheelHandler, { passive: false });
      }
    }
    
    // Mouse drag to pan
    if (enableDrag) {
      const canvas = pixiContainer.parent?.canvas || document;
      let mouseDown = false;
      let mouseStart = { x: 0, y: 0 };
      
      const mouseDownHandler = (e) => {
        mouseDown = true;
        mouseStart = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      };
      
      const mouseMoveHandler = (e) => {
        if (!mouseDown) return;
        const dx = e.clientX - mouseStart.x;
        const dy = e.clientY - mouseStart.y;
        setPan(lastPan.x + dx, lastPan.y + dy);
        mouseStart = { x: e.clientX, y: e.clientY };
      };
      
      const mouseUpHandler = () => {
        mouseDown = false;
        canvas.style.cursor = 'grab';
      };
      
      if (canvas.addEventListener) {
        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseup', mouseUpHandler);
        canvas.addEventListener('mouseleave', mouseUpHandler);
        canvas.style.cursor = 'grab';
      }
    }
    
    // Touch pinch zoom and pan
    if (enablePinchZoom) {
      const canvas = pixiContainer.parent?.canvas || document;
      
      const touchStartHandler = (e) => {
        touchStartPositions = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        if (e.touches.length === 1) {
          isDragging = true;
          dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      };
      
      const touchMoveHandler = (e) => {
        e.preventDefault();
        
        if (e.touches.length === 2) {
          // Pinch zoom
          isDragging = false;
          const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
          const distance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
          
          if (lastPinchDistance > 0) {
            const scale = distance / lastPinchDistance;
            const centerX = (touch1.x + touch2.x) / 2;
            const centerY = (touch1.y + touch2.y) / 2;
            setZoom(currentZoom * scale, centerX, centerY);
          }
          
          lastPinchDistance = distance;
        } else if (e.touches.length === 1 && isDragging) {
          // Single touch pan
          const dx = e.touches[0].clientX - dragStart.x;
          const dy = e.touches[0].clientY - dragStart.y;
          setPan(lastPan.x + dx, lastPan.y + dy);
          dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      };
      
      const touchEndHandler = (e) => {
        if (e.touches.length === 0) {
          isDragging = false;
          lastPinchDistance = 0;
          touchStartPositions = [];
        } else if (e.touches.length === 1) {
          lastPinchDistance = 0;
        }
      };
      
      if (canvas.addEventListener) {
        canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
        canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
        canvas.addEventListener('touchend', touchEndHandler);
        canvas.addEventListener('touchcancel', touchEndHandler);
      }
    }
    
    const instance = {
      id: instanceId,
      setZoom: setZoom,
      setPan: setPan,
      resetView: resetView,
      getZoom: () => currentZoom,
      getPan: () => ({ x: pixiContainer.x, y: pixiContainer.y }),
      destroy: () => {
        if (zoomControlsContainer) {
          zoomControlsContainer.remove();
        }
        zoomPanInstances.delete(instanceId);
      }
    };
    
    zoomPanInstances.set(instanceId, instance);
    return instance;
  }
  
  // Hotspot Management
  const hotspotInstances = new Map();
  
  function createHotspot(imageSprite, options = {}) {
    if (!imageSprite) {
      console.warn('[SDK] createHotspot: imageSprite is required');
      return null;
    }
    
    const {
      x = 0,
      y = 0,
      radius = 20,
      shape = 'circle', // 'circle', 'rect', 'polygon'
      width = null, // For rect shape
      height = null, // For rect shape
      points = null, // For polygon shape: [{x, y}, ...]
      visible = false,
      color = 0x00ff00,
      alpha = 0.3,
      cursor = 'pointer',
      id = 'hotspot_' + Date.now() + '_' + Math.random(),
      onHover = null,
      onLeave = null,
      onClick = null
    } = options;
    
    // Create hotspot container
    const hotspotContainer = new PIXI.Container();
    hotspotContainer.x = x;
    hotspotContainer.y = y;
    hotspotContainer.eventMode = 'static';
    hotspotContainer.cursor = cursor;
    
    // Create visual indicator if visible
    let indicator = null;
    if (visible) {
      indicator = new PIXI.Graphics();
      
      if (shape === 'circle') {
        indicator.beginFill(color, alpha);
        indicator.drawCircle(0, 0, radius);
        indicator.endFill();
        hotspotContainer.hitArea = new PIXI.Circle(0, 0, radius);
      } else if (shape === 'rect') {
        const w = width || radius * 2;
        const h = height || radius * 2;
        indicator.beginFill(color, alpha);
        indicator.drawRect(-w/2, -h/2, w, h);
        indicator.endFill();
        hotspotContainer.hitArea = new PIXI.Rectangle(-w/2, -h/2, w, h);
      } else if (shape === 'polygon' && points) {
        indicator.beginFill(color, alpha);
        indicator.drawPolygon(points.map(p => new PIXI.Point(p.x, p.y)));
        indicator.endFill();
        hotspotContainer.hitArea = new PIXI.Polygon(points.map(p => new PIXI.Point(p.x, p.y)));
      }
      
      if (indicator) {
        hotspotContainer.addChild(indicator);
      }
    } else {
      // Invisible hotspot still needs hit area
      if (shape === 'circle') {
        hotspotContainer.hitArea = new PIXI.Circle(0, 0, radius);
      } else if (shape === 'rect') {
        const w = width || radius * 2;
        const h = height || radius * 2;
        hotspotContainer.hitArea = new PIXI.Rectangle(-w/2, -h/2, w, h);
      } else if (shape === 'polygon' && points) {
        hotspotContainer.hitArea = new PIXI.Polygon(points.map(p => new PIXI.Point(p.x, p.y)));
      }
    }
    
    // Add event handlers
    if (onHover) {
      hotspotContainer.on('pointerenter', () => onHover(hotspot));
    }
    
    if (onLeave) {
      hotspotContainer.on('pointerleave', () => onLeave(hotspot));
    }
    
    if (onClick) {
      hotspotContainer.on('pointerdown', (event) => {
        onClick(hotspot, event);
      });
    }
    
    // Add to image sprite's parent (or create parent container)
    if (imageSprite.parent) {
      imageSprite.parent.addChild(hotspotContainer);
    } else {
      console.warn('[SDK] createHotspot: imageSprite must be added to stage first');
    }
    
    const hotspot = {
      id: id,
      container: hotspotContainer,
      indicator: indicator,
      imageSprite: imageSprite,
      x: x,
      y: y,
      radius: radius,
      shape: shape,
      visible: visible,
      setVisible: (visible) => {
        if (indicator) {
          indicator.visible = visible;
        }
        hotspot.visible = visible;
      },
      setPosition: (newX, newY) => {
        hotspotContainer.x = newX;
        hotspotContainer.y = newY;
        hotspot.x = newX;
        hotspot.y = newY;
      },
      destroy: () => {
        if (hotspotContainer.parent) {
          hotspotContainer.parent.removeChild(hotspotContainer);
        }
        hotspotContainer.destroy({ children: true });
        hotspotInstances.delete(id);
      }
    };
    
    hotspotInstances.set(id, hotspot);
    return hotspot;
  }
  
  // Create multiple hotspots from config array
  function createHotspots(imageSprite, hotspotConfigs) {
    if (!Array.isArray(hotspotConfigs)) {
      console.warn('[SDK] createHotspots: hotspotConfigs must be an array');
      return [];
    }
    
    return hotspotConfigs.map(config => createHotspot(imageSprite, config));
  }
  
  return {
    emitEvent: (event, processedContentId) => sendMessage("ai-sdk-emit-event", { event, processedContentId }),
    updateState: (key, value) => sendMessage("ai-sdk-update-state", { key, value }),
    getState: (callback) => sendMessage("ai-sdk-get-state", {}, (response) => callback(response.state)),
    // HTML/PixiJS Layering Utilities
    positionInputBesideButton: positionInputBesideButton,
    repositionAllInputs: repositionAllInputs,
    startPositioningLoop: startPositioningLoop,
    stopPositioningLoop: stopPositioningLoop,
    // Coordinate Transformation
    convertPixiToScreen: convertPixiToScreen,
    convertScreenToPixi: convertScreenToPixi,
    getViewTransform: getViewTransform,
    // HTML Element Attachment
    attachHtmlToPixiElement: attachHtmlToPixiElement,
    updateAllAttachedHtml: updateAllAttachedHtml,
    detachHtmlFromPixiElement: detachHtmlFromPixiElement,
    attachInputToImageArea: attachInputToImageArea,
    // Zoom/Pan Management
    setupZoomPan: setupZoomPan,
    // Hotspot Creation
    createHotspot: createHotspot,
    createHotspots: createHotspots,
    onResponse: (callback) => {
      subscriptionId = generateSubscriptionId();
      sendMessage("ai-sdk-subscribe", { subscriptionId }, () => {
        const listener = (event) => {
          if (event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) {
            callback(event.data.response);
          }
        };
        window.addEventListener("message", listener);
        return () => {
          window.removeEventListener("message", listener);
          sendMessage("ai-sdk-unsubscribe", { subscriptionId });
        };
      });
    },
    isReady: (callback) => {
      const listener = (event) => {
        if (event.data.type === "ai-sdk-ready") {
          window.removeEventListener("message", listener);
          callback(true);
        }
      };
      window.addEventListener("message", listener);
    },
    minimizeChatUI: () => sendMessage("ai-sdk-minimize-chat-ui", {}),
    showChatUI: () => sendMessage("ai-sdk-show-chat-ui", {}),
    activateFullscreen: () => sendMessage("ai-sdk-activate-fullscreen", {}),
    deactivateFullscreen: () => sendMessage("ai-sdk-deactivate-fullscreen", {}),
    postToChat: (content, role = "assistant", openChat = false) => sendMessage("ai-sdk-post-to-chat", { content, role, openChat }),
    showScript: (text, openChat = false) => sendMessage("ai-sdk-show-script", { text, openChat }),
    showSnack: (content, duration, hideFromChatUI, callback) => sendMessage("ai-sdk-show-snack", { content, duration, hideFromChatUI: hideFromChatUI || false }, (response) => { if (callback && response.snackId) callback(response.snackId); }),
    hideSnack: () => sendMessage("ai-sdk-hide-snack", {}),
    saveInstanceData: (data, callback) => sendMessage("ai-sdk-save-instance-data", { data }, (response) => { if (callback) callback(response.success, response.error); }),
    getInstanceDataHistory: (filters, callback) => {
      const filtersData = filters ? { dateFrom: filters.dateFrom?.toISOString(), dateTo: filters.dateTo?.toISOString(), limit: filters.limit } : {};
      sendMessage("ai-sdk-get-instance-data-history", { filters: filtersData }, (response) => { if (callback) callback(response.data, response.error); });
    },
    saveUserProgress: (data, callback) => sendMessage("ai-sdk-save-user-progress", { data }, (response) => { if (callback) callback(response.progress, response.error); }),
    getUserProgress: (callback) => sendMessage("ai-sdk-get-user-progress", {}, (response) => { if (callback) callback(response.progress, response.error); }),
    markCompleted: (callback) => sendMessage("ai-sdk-mark-completed", {}, (response) => { if (callback) callback(response.progress, response.error); }),
    incrementAttempts: (callback) => sendMessage("ai-sdk-increment-attempts", {}, (response) => { if (callback) callback(response.progress, response.error); }),
    getUserPublicProfile: (userId, callback) => sendMessage("ai-sdk-get-user-public-profile", { userId }, (response) => { if (callback) callback(response.profile, response.error); }),
    generateImage: (options, callback) => {
      // Ensure lessonId and accountId are included in options
      const optionsWithIds = {
        ...options,
        lessonId: options.lessonId || currentLessonId,
        accountId: options.accountId || currentAccountId,
      };
      console.log("[SDK Test] Generating image with options:", { 
        prompt: optionsWithIds.prompt, 
        lessonId: optionsWithIds.lessonId, 
        accountId: optionsWithIds.accountId 
      });
      sendMessage("ai-sdk-generate-image", { options: optionsWithIds }, (response) => { 
        if (callback) callback(response); 
      });
    },
    getLessonImages: (lessonId, accountId, imageId, callback) => {
      // Use provided lessonId or fall back to stored currentLessonId
      const targetLessonId = lessonId || currentLessonId;
      if (!targetLessonId) {
        console.warn("[SDK Test] No lesson ID available for getLessonImages");
        if (callback) callback([], "No lesson ID available");
        return;
      }
      sendMessage("ai-sdk-get-lesson-images", { lessonId: targetLessonId, accountId, imageId }, (response) => { 
        if (callback) callback(response.images || [], response.error); 
      });
    },
    getLessonImageIds: (lessonId, accountId, callback) => {
      // Use provided lessonId or fall back to stored currentLessonId
      const targetLessonId = lessonId || currentLessonId;
      if (!targetLessonId) {
        console.warn("[SDK Test] No lesson ID available for getLessonImageIds");
        if (callback) callback([], "No lesson ID available");
        return;
      }
      sendMessage("ai-sdk-get-lesson-image-ids", { lessonId: targetLessonId, accountId }, (response) => { 
        if (callback) callback(response.imageIds || [], response.error); 
      });
    },
    deleteImage: (imageId, callback) => {
      sendMessage("ai-sdk-delete-image", { imageId }, (response) => { 
        if (callback) callback(response, response.error); 
      });
    },
    // HTML Element Positioning Helpers (Container-Based Approach)
    // Helper: Create an input field positioned beside a button
    createInputForButton: (buttonContainer, options = {}) => {
      const {
        placeholder = '',
        width = 200,
        inputId = null,
        offsetX = 10,
        offsetY = 0
      } = options;
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.style.width = width + 'px';
      input.style.padding = '8px';
      input.style.border = '2px solid #00d4ff';
      input.style.borderRadius = '4px';
      input.style.background = 'rgba(15, 15, 35, 0.9)';
      input.style.color = '#ffffff';
      input.style.fontSize = '12px';
      
      if (inputId) {
        input.id = inputId;
      }
      
      // Append to pixi-container so it scrolls with content
      const pixiContainerElement = document.getElementById('pixi-container');
      if (pixiContainerElement) {
        pixiContainerElement.appendChild(input);
      } else {
        document.body.appendChild(input);
      }
      
      // Attach to button container, positioned to the right
      attachHtmlToPixiElement(input, buttonContainer, {
        offsetX: (buttonContainer.width || 280) + offsetX,
        offsetY: offsetY,
        anchor: 'center-left',
        zIndex: 1000
      });
      
      return input;
    },
    // Helper: Create an HTML element and attach it to a PixiJS container
    createHtmlElementForContainer: (tagName, pixiContainer, options = {}) => {
      const {
        className = '',
        id = null,
        innerHTML = '',
        styles = {},
        offsetX = 0,
        offsetY = 0,
        anchor = 'center',
        zIndex = 1000
      } = options;
      
      const element = document.createElement(tagName);
      if (className) element.className = className;
      if (id) element.id = id;
      if (innerHTML) element.innerHTML = innerHTML;
      
      // Apply custom styles
      Object.assign(element.style, {
        padding: '8px',
        background: 'rgba(15, 15, 35, 0.9)',
        color: '#ffffff',
        fontSize: '12px',
        borderRadius: '4px',
        ...styles
      });
      
      // Append to pixi-container so it scrolls with content
      const pixiContainerElement = document.getElementById('pixi-container');
      if (pixiContainerElement) {
        pixiContainerElement.appendChild(element);
      } else {
        document.body.appendChild(element);
      }
      
      // Attach to container
      attachHtmlToPixiElement(element, pixiContainer, {
        offsetX: offsetX,
        offsetY: offsetY,
        anchor: anchor,
        zIndex: zIndex
      });
      
      return element;
    },
    // HTML Update Loop Control
    startHtmlUpdateLoop: startHtmlUpdateLoop,
    stopHtmlUpdateLoop: stopHtmlUpdateLoop,
    updateAllAttachedHtml: updateAllAttachedHtml
  };
  
  // Start the HTML update loop automatically when SDK is created
  startHtmlUpdateLoop();
  
  return aiSDK;
};

function initTestApp() {
  console.log("[SDK Test] initTestApp called");
  const container = document.getElementById("pixi-container");
  if (!container) {
    const newContainer = document.createElement("div");
    newContainer.id = "pixi-container";
    document.body.appendChild(newContainer);
    setTimeout(initTestApp, 10);
    return;
  }
  if (!window.PIXI) {
    console.error("[SDK Test] PIXI is not available!");
    return;
  }
  const app = new PIXI.Application({
    width: Math.max(window.innerWidth, 800),
    height: Math.max(window.innerHeight, 600),
    backgroundColor: 0x0f0f23,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  container.appendChild(app.view);
  container.style.overflow = 'hidden'; // Prevent double scrollbars - scrolling handled by parent
  container.style.width = '100%';
  container.style.height = '100%';
  
  // Aggressively enforce overflow hidden on pixi-container
  const pixiContainerElement = document.getElementById('pixi-container');
  if (pixiContainerElement) {
    pixiContainerElement.style.overflow = 'hidden';
    pixiContainerElement.style.overflowX = 'hidden';
    pixiContainerElement.style.overflowY = 'hidden';
  }
  
  // Set up a MutationObserver to enforce overflow hidden if it gets changed
  if (pixiContainerElement) {
    const observer = new MutationObserver(() => {
      if (pixiContainerElement.style.overflow !== 'hidden') {
        pixiContainerElement.style.overflow = 'hidden';
        pixiContainerElement.style.overflowX = 'hidden';
        pixiContainerElement.style.overflowY = 'hidden';
      }
    });
    observer.observe(pixiContainerElement, { attributes: true, attributeFilter: ['style'] });
  }
  
  const aiSDK = createIframeAISDK();
  
  // Restore image immediately if state exists and resize canvas
  setTimeout(() => {
    restoreDisplayedImage();
    resizeCanvasToFitContent();
  }, 100);
  // Make aiSDK available globally for debugging
  window.aiSDK = aiSDK;
  
  // HTML update loop is started automatically when SDK is created
  // Update HTML elements when canvas resizes
  app.renderer.on('resize', () => {
    if (aiSDK && aiSDK.updateAllAttachedHtml) {
      aiSDK.updateAllAttachedHtml();
    }
    // Ensure container overflow stays hidden
    const pixiContainerElement = document.getElementById('pixi-container');
    if (pixiContainerElement) {
      pixiContainerElement.style.overflow = 'hidden';
    }
    // Restore displayed image after canvas resize
    setTimeout(() => {
      restoreDisplayedImage();
      // Resize canvas to fit all content after restore
      resizeCanvasToFitContent();
    }, 100); // Delay to ensure resize is complete
  });
  
  // Function to restore displayed image from stored state
  function restoreDisplayedImage() {
    // First check if sprite exists but was removed from stage
    if (displayedImageSprite && app && app.stage && app.stage.children.indexOf(displayedImageSprite) === -1) {
      console.log("[SDK Test] ⚠️ Re-adding displayed image to stage");
      app.stage.addChild(displayedImageSprite);
      app.render();
      return;
    }
    
    // Try to restore from localStorage if memory state is lost
    if (!storedImageState) {
      try {
        const savedState = localStorage.getItem('sdk-test-image-state');
        if (savedState) {
          storedImageState = JSON.parse(savedState);
          console.log("[SDK Test] 🔄 Restored image state from localStorage:", storedImageState);
        }
      } catch (e) {
        console.warn("[SDK Test] ⚠️ Could not restore from localStorage:", e);
      }
    }
    
    // Then check if we need to restore from stored state
    if (storedImageState && (!displayedImageSprite || (app && app.stage && app.stage.children.indexOf(displayedImageSprite) === -1))) {
      console.log("[SDK Test] 🔄 Restoring displayed image from stored state:", storedImageState);
      const dataUrl = storedImageState.url.startsWith("data:") ? storedImageState.url : (storedImageState.url.startsWith("http") ? storedImageState.url : "data:image/png;base64," + storedImageState.url);
      PIXI.Assets.load(dataUrl).then((texture) => {
        if (!app || !app.stage) {
          console.warn("[SDK Test] ⚠️ App or stage not available for image restoration");
          return;
        }
        displayedImageSprite = new PIXI.Sprite(texture);
        displayedImageSprite.width = storedImageState.width;
        displayedImageSprite.height = storedImageState.height;
        displayedImageSprite.x = storedImageState.x;
        displayedImageSprite.y = storedImageState.y;
        app.stage.addChild(displayedImageSprite);
        
        // Resize canvas to fit restored image
        const currentHeight = app.screen.height;
        const newHeight = Math.max(currentHeight, displayedImageSprite.y + displayedImageSprite.height + 100);
        app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
        
        app.render();
        console.log("[SDK Test] ✅ Image restored successfully, canvas resized to:", newHeight);
      }).catch((error) => {
        console.error("[SDK Test] ❌ Error restoring image:", error);
        storedImageState = null; // Clear invalid state
        try {
          localStorage.removeItem('sdk-test-image-state');
        } catch (e) {
          // Ignore
        }
      });
    }
  }
  
  // Function to resize canvas to fit all content
  function resizeCanvasToFitContent() {
    if (!app || !app.renderer) return;
    
    let contentBottom = 0;
    
    // Check displayed image
    if (displayedImageSprite) {
      contentBottom = Math.max(contentBottom, displayedImageSprite.y + displayedImageSprite.height);
    }
    
    // Check gallery - calculate actual height based on number of images and rows
    if (imageGalleryContainer && recalledImages.length > 0) {
      const maxImagesPerRow = 3;
      const imageSize = 200;
      const rows = Math.ceil(recalledImages.length / maxImagesPerRow);
      const rowHeight = imageSize + 110; // Height per row including spacing
      const galleryTitleHeight = 50; // Title height
      const actualGalleryHeight = galleryTitleHeight + (rows * rowHeight);
      const galleryBottom = imageGalleryContainer.y + actualGalleryHeight;
      contentBottom = Math.max(contentBottom, galleryBottom);
      console.log("[SDK Test] 📐 Gallery height calculated:", actualGalleryHeight, "rows:", rows, "bottom:", galleryBottom);
    }
    
    // Check image IDs container
    if (imageIdsDisplayContainer) {
      const idsBottom = imageIdsDisplayContainer.y + (imageIdsDisplayContainer.height || 0);
      contentBottom = Math.max(contentBottom, idsBottom);
    }
    
    // Add padding
    const newHeight = Math.max(app.screen.height, contentBottom + 100);
    app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
    console.log("[SDK Test] 🔄 Canvas resized to fit content, height:", newHeight, "contentBottom:", contentBottom);
  }
  
  // Update HTML elements on window resize
  window.addEventListener('resize', () => {
    if (aiSDK && aiSDK.updateAllAttachedHtml) {
      aiSDK.updateAllAttachedHtml();
    }
    // Ensure container overflow stays hidden
    const pixiContainerElement = document.getElementById('pixi-container');
    if (pixiContainerElement) {
      pixiContainerElement.style.overflow = 'hidden';
    }
    // Restore displayed image after window resize (handles mobile/desktop view switching)
    setTimeout(() => {
      restoreDisplayedImage();
      // Resize canvas to fit all content after restore
      resizeCanvasToFitContent();
    }, 200); // Longer delay to ensure canvas is fully ready after viewport change
  });
  
  // Update HTML elements when pixi-container scrolls
  const pixiContainerElement = document.getElementById('pixi-container');
  if (pixiContainerElement && aiSDK) {
    pixiContainerElement.addEventListener('scroll', () => {
      if (aiSDK && aiSDK.updateAllAttachedHtml) {
        aiSDK.updateAllAttachedHtml();
      }
      // Restore displayed image during scroll if needed
      restoreDisplayedImage();
    }, { passive: true });
  }
  let sdkReady = false;
  const isPreviewMode = !window.parent || window.parent === window || (window.parent.location && window.parent.location.href.includes('blob:'));
  let statusText = null;
  let statusYPos = 0;
  let statusTextInitialized = false;
  function updateStatus(message, color = 0xffffff) {
    if (!statusTextInitialized) {
      console.log("[SDK Test] " + message);
      return;
    }
    if (!statusText) {
      statusText = new PIXI.Text(message, { fontSize: 14, fill: color, wordWrap: true, wordWrapWidth: window.innerWidth - 40 });
      statusText.x = 20;
      statusText.y = statusYPos;
      app.stage.addChild(statusText);
    } else {
      statusText.text = message;
      statusText.style.fill = color;
    }
    console.log("[SDK Test] " + message);
  }
  let yPos = 80;
  const buttonHeight = 40;
  const buttonSpacing = 10;
  const buttonWidth = 280;
  function createButton(text, onClick, x = 20) {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x00d4ff, 0.7);
    bg.drawRect(0, 0, buttonWidth, buttonHeight);
    bg.endFill();
    bg.alpha = 0.7;
    bg.eventMode = "static";
    bg.cursor = "pointer";
    const label = new PIXI.Text(text, { fontSize: 12, fill: 0x0f0f23, align: "center", wordWrap: true, wordWrapWidth: buttonWidth - 10 });
    label.x = 5;
    label.y = (buttonHeight - label.height) / 2;
    const container = new PIXI.Container();
    container.addChild(bg);
    container.addChild(label);
    container.x = x;
    container.y = yPos;
    bg.on("pointerdown", () => {
      bg.alpha = 0.5;
      setTimeout(() => { bg.alpha = 0.7; onClick(); }, 100);
    });
    app.stage.addChild(container);
    const buttonY = yPos;
    yPos += buttonHeight + buttonSpacing;
    // Return container with position info for HTML input positioning
    container.buttonY = buttonY;
    container.buttonX = x;
    return container;
  }
  
  // SDK utilities are now available via aiSDK.positionInputBesideButton and aiSDK.repositionAllInputs
  // No need for local functions - use the SDK methods directly
  
  // IMAGE GENERATION SECTION - Move to top so input fields appear beside correct buttons
  const imageLabel = new PIXI.Text("IMAGE GENERATION", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  imageLabel.x = 20;
  imageLabel.y = yPos;
  app.stage.addChild(imageLabel);
  yPos += 30;
  
  // Get the HTML input field for image prompt (positioned beside button via CSS)
  const promptInput = document.getElementById("image-prompt-input");
  console.log("[SDK Test] 🔍 Looking for image-prompt-input:", !!promptInput);
  if (!promptInput) {
    console.warn("[SDK Test] ⚠️ Image prompt input field not found. Make sure HTML code includes input element with id image-prompt-input");
  } else {
    console.log("[SDK Test] ✅ Found image-prompt-input, current style:", {
      position: promptInput.style.position,
      left: promptInput.style.left,
      top: promptInput.style.top,
      visibility: promptInput.style.visibility,
      display: promptInput.style.display
    });
  }
  
  let imagePromptText = "";
  let generatedImageUrl = null;
  let generatedImageData = null;
  let imageReady = false;
  let isGenerating = false; // Track if image generation is in progress
  let displayedImageSprite = null;
  // Store image state for restoration after viewport changes
  let storedImageState = null; // { url, x, y, width, height }
  
  // Try to restore image state from localStorage on initialization
  try {
    const savedState = localStorage.getItem('sdk-test-image-state');
    if (savedState) {
      storedImageState = JSON.parse(savedState);
      console.log("[SDK Test] 🔄 Restored image state from localStorage on init:", storedImageState);
    }
  } catch (e) {
    console.warn("[SDK Test] ⚠️ Could not restore image state from localStorage:", e);
  }
  
  let recalledImages = [];
  let imageGalleryContainer = null;
  let lessonImageIds = []; // Track image IDs for this lesson
  let imageIdsDisplayContainer = null; // Container for displaying image IDs list
  
  // Update prompt text when input changes (if input field exists)
  if (promptInput) {
    promptInput.addEventListener("input", (e) => {
      imagePromptText = (e.target && e.target.value) ? e.target.value : "";
    });
  }
  
  // Helper function to get the bottom Y position of the lowest visible element
  // This helps prevent overlapping by calculating safe Y positions
  function getLowestElementBottom() {
    let lowestY = yPos; // Start with button area
    
    // Check status text position
    if (statusText && statusText.y !== undefined) {
      const statusBottom = statusText.y + (statusText.height || 20);
      lowestY = Math.max(lowestY, statusBottom);
    }
    
    // Check image IDs display (both PixiJS container and HTML container)
    if (imageIdsDisplayContainer && imageIdsDisplayContainer.y !== undefined) {
      let containerHeight = 25; // Header height
      // Account for the HTML container height (which is attached to the PixiJS container)
      if (imageIdsHtmlContainer) {
        // Get actual height of HTML container which includes all IDs
        const htmlHeight = imageIdsHtmlContainer.getBoundingClientRect().height || 0;
        containerHeight = htmlHeight + 25; // HTML height + header height
      } else {
        // Fallback: estimate based on number of IDs if HTML container not available
        lessonImageIds.forEach(() => {
          containerHeight += 20; // Approximate height per ID line
        });
      }
      const idsBottom = imageIdsDisplayContainer.y + containerHeight;
      lowestY = Math.max(lowestY, idsBottom);
    }
    
    // Check displayed image
    if (displayedImageSprite && displayedImageSprite.y !== undefined) {
      const imageBottom = displayedImageSprite.y + displayedImageSprite.height;
      lowestY = Math.max(lowestY, imageBottom);
    }
    
    // Check gallery
    if (imageGalleryContainer && imageGalleryContainer.y !== undefined) {
      const galleryBottom = imageGalleryContainer.y + (imageGalleryContainer.height || 0);
      lowestY = Math.max(lowestY, galleryBottom);
    }
    
    return lowestY;
  }
  
  // Function to update the image IDs display
  // Use HTML elements instead of PixiJS text so IDs can be selected/copied
  let imageIdsHtmlContainer = null; // HTML container for selectable image IDs
  function updateImageIdsDisplay() {
    // Remove old PixiJS display if exists
    if (imageIdsDisplayContainer) {
      app.stage.removeChild(imageIdsDisplayContainer);
      imageIdsDisplayContainer = null;
    }
    
    // Remove old HTML display if exists (with proper cleanup)
    if (imageIdsHtmlContainer) {
      // Remove event listeners
      if (imageIdsHtmlContainer._resizeHandler) {
        window.removeEventListener('resize', imageIdsHtmlContainer._resizeHandler);
      }
      if (imageIdsHtmlContainer._scrollHandler) {
        window.removeEventListener('scroll', imageIdsHtmlContainer._scrollHandler, true);
      }
      if (imageIdsHtmlContainer._rendererResizeHandler && app && app.renderer) {
        app.renderer.off('resize', imageIdsHtmlContainer._rendererResizeHandler);
      }
      imageIdsHtmlContainer.remove();
      imageIdsHtmlContainer = null;
    }
    
    if (lessonImageIds.length === 0) {
      return; // Don't display anything if no image IDs
    }
    
    // Find current yPos (after all buttons)
    let currentYPos = yPos;
    if (imageIdsDisplayContainer && imageIdsDisplayContainer.y) {
      currentYPos = imageIdsDisplayContainer.y;
    }
    
    // Create PixiJS container for the label (header)
    imageIdsDisplayContainer = new PIXI.Container();
    imageIdsDisplayContainer.x = 20;
    // Position below the lowest element with safe spacing to prevent overlap
    const lowestBottom = getLowestElementBottom();
    imageIdsDisplayContainer.y = Math.max(currentYPos + 50, lowestBottom + 20); // 20px spacing after lowest element
    
    const labelText = new PIXI.Text("Lesson Image IDs:", { fontSize: 14, fill: 0x00d4ff, fontWeight: "bold" });
    labelText.x = 0;
    labelText.y = 0;
    imageIdsDisplayContainer.addChild(labelText);
    app.stage.addChild(imageIdsDisplayContainer);
    
    // Create HTML container for selectable image IDs
    // Position it relative to the canvas container so it scrolls with the canvas
    const pixiContainer = document.getElementById('pixi-container');
    if (!pixiContainer) {
      console.error('[SDK Test] pixi-container not found!');
      return;
    }
    
    console.log('[SDK Test] Creating image IDs HTML container, lessonImageIds.length:', lessonImageIds.length);
    console.log('[SDK Test] pixi-container styles:', {
      position: window.getComputedStyle(pixiContainer).position,
      overflow: window.getComputedStyle(pixiContainer).overflow,
      width: window.getComputedStyle(pixiContainer).width,
      height: window.getComputedStyle(pixiContainer).height
    });
    
    // Create HTML container for selectable image IDs
    // Use container-based positioning: attach HTML to the PixiJS container
    imageIdsHtmlContainer = document.createElement('div');
    imageIdsHtmlContainer.id = 'image-ids-html-container';
    imageIdsHtmlContainer.style.backgroundColor = 'rgba(15, 15, 35, 0.9)';
    imageIdsHtmlContainer.style.padding = '5px 10px';
    imageIdsHtmlContainer.style.borderRadius = '4px';
    imageIdsHtmlContainer.style.fontFamily = 'monospace';
    imageIdsHtmlContainer.style.fontSize = '12px';
    imageIdsHtmlContainer.style.color = '#ffffff';
    imageIdsHtmlContainer.style.lineHeight = '1.5';
    imageIdsHtmlContainer.style.userSelect = 'text';
    imageIdsHtmlContainer.style.cursor = 'text';
    imageIdsHtmlContainer.style.maxWidth = (window.innerWidth - 80) + 'px';
    imageIdsHtmlContainer.style.pointerEvents = 'none'; // Allow clicks to pass through to canvas buttons
    
    // Add each image ID as a selectable line
    lessonImageIds.forEach((imageId, index) => {
      const idLine = document.createElement('div');
      idLine.textContent = (index + 1) + '. ' + imageId;
      idLine.style.marginBottom = '4px';
      idLine.style.userSelect = 'text';
      idLine.style.pointerEvents = 'auto'; // Re-enable pointer events on text so it can be selected
      idLine.style.cursor = 'text';
      imageIdsHtmlContainer.appendChild(idLine);
    });
    
    // Append to body first (required for attachHtmlToPixiElement)
    document.body.appendChild(imageIdsHtmlContainer);
    
    // Attach to the PixiJS container using container-based positioning
    // This ensures perfect alignment and automatic scroll synchronization
    if (aiSDK && aiSDK.attachHtmlToPixiElement) {
      aiSDK.attachHtmlToPixiElement(imageIdsHtmlContainer, imageIdsDisplayContainer, {
        offsetX: 30, // Align with container x position (20) + padding
        offsetY: 25, // Position below header label
        anchor: 'top-left',
        zIndex: 100, // Higher z-index to ensure visibility above canvas
        updateOnTransform: true // Update position during scroll
      });
      console.log('[SDK Test] ✅ Image IDs HTML container attached to PixiJS container using container-based positioning');
    } else {
      console.warn('[SDK Test] ⚠️ attachHtmlToPixiElement not available, falling back to manual positioning');
    }
    
    // Resize canvas to fit content, but preserve displayed image
    // Calculate the bottom of all content including displayed image
    let contentBottom = imageIdsDisplayContainer.y + (lessonImageIds.length * 20) + 30;
    if (displayedImageSprite) {
      // Include displayed image in height calculation
      contentBottom = Math.max(contentBottom, displayedImageSprite.y + displayedImageSprite.height + 20);
    }
    const currentHeight = app.screen.height;
    const newHeight = Math.max(currentHeight, contentBottom + 100);
    app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
    
    // Ensure displayed image is still visible after resize
    if (displayedImageSprite && app.stage.children.indexOf(displayedImageSprite) === -1) {
      // Image was accidentally removed, re-add it
      console.log("[SDK Test] ⚠️ Re-adding displayed image after canvas resize");
      app.stage.addChild(displayedImageSprite);
      app.render();
    }
  }
  
  // Create button with input field beside it
  console.log("[SDK Test] 🔍 Creating Request Image button, promptInput exists:", !!promptInput);
  const requestImageButton = createButton("Request Image", () => {
    imagePromptText = promptInput ? promptInput.value.trim() : "";
    if (!imagePromptText) {
      updateStatus("Please enter an image prompt first", 0xff0000);
      return;
    }
    
    // Prevent multiple simultaneous requests
    if (isGenerating) {
      console.log("[SDK Test] ⚠️ Image generation already in progress, ignoring duplicate click");
      updateStatus("Image generation already in progress...", 0xffff00);
      return;
    }
    
    isGenerating = true;
    updateStatus("Generating image...", 0xffff00);
    imageReady = false;
    generatedImageUrl = null;
    generatedImageData = null;
    // Remove displayed image, gallery, and clear image IDs display when generating new image
    if (displayedImageSprite) {
      app.stage.removeChild(displayedImageSprite);
      displayedImageSprite = null;
      storedImageState = null; // Clear stored state when generating new image
      try {
        localStorage.removeItem('sdk-test-image-state');
      } catch (e) {
        // Ignore
      }
    }
    if (imageGalleryContainer) {
      console.log("[SDK Test] 🗑️ Removing gallery before generating new image");
      app.stage.removeChild(imageGalleryContainer);
      imageGalleryContainer = null;
    }
    // Clear image IDs display and recalled images
    if (imageIdsDisplayContainer) {
      console.log("[SDK Test] 🗑️ Removing image IDs display before generating new image");
      app.stage.removeChild(imageIdsDisplayContainer);
      imageIdsDisplayContainer = null;
    }
    // Also remove HTML container if it exists (with proper cleanup)
    if (imageIdsHtmlContainer) {
      // Remove event listeners
      if (imageIdsHtmlContainer._resizeHandler) {
        window.removeEventListener('resize', imageIdsHtmlContainer._resizeHandler);
      }
      if (imageIdsHtmlContainer._scrollHandler) {
        window.removeEventListener('scroll', imageIdsHtmlContainer._scrollHandler, true);
      }
      if (imageIdsHtmlContainer._rendererResizeHandler && app && app.renderer) {
        app.renderer.off('resize', imageIdsHtmlContainer._rendererResizeHandler);
      }
      imageIdsHtmlContainer.remove();
      imageIdsHtmlContainer = null;
    }
    recalledImages = []; // Clear recalled images array
    // Don't clear lessonImageIds here - we want to keep existing IDs and add the new one
    // The image IDs display will be updated when the new image ID is added
    aiSDK.generateImage({ prompt: imagePromptText, userInput: "Test input from SDK", width: 1024, height: 1024 }, (response) => {
      console.log("[SDK Test] 🔍 Image generation response:", response);
      
      // Input repositioning will happen AFTER image is loaded and displayed
      // (see loadAndDisplayImage function)
      
      isGenerating = false; // Reset generation flag
      
      if (response.success) {
        if (response.imageUrl) {
          generatedImageUrl = response.imageUrl;
          imageReady = true;
          updateStatus("Image ready! Loading...", 0x00ff00);
          // Clear the prompt input field after successful generation
          if (promptInput) {
            promptInput.value = "";
            imagePromptText = "";
          }
          loadAndDisplayImage(response.imageUrl);
        } else if (response.imageData) {
          generatedImageData = response.imageData;
          imageReady = true;
          updateStatus("Image ready! Loading...", 0x00ff00);
          // Clear the prompt input field after successful generation
          if (promptInput) {
            promptInput.value = "";
            imagePromptText = "";
          }
          loadAndDisplayImage(response.imageData);
        } else {
          updateStatus("Image generated but no URL/data returned", 0xffff00);
          imageReady = false;
        }
        
        // Add image ID to the list if provided
        console.log("[SDK Test] 🔍 Checking for imageId in response:", response.imageId);
        if (response.imageId) {
          if (!lessonImageIds.includes(response.imageId)) {
            lessonImageIds.push(response.imageId);
            console.log("[SDK Test] ✅ Added image ID to list:", response.imageId, "Total IDs:", lessonImageIds.length);
            updateImageIdsDisplay();
          } else {
            console.log("[SDK Test] ⚠️ Image ID already in list:", response.imageId);
          }
        } else {
          console.warn("[SDK Test] ⚠️ No imageId in response:", response);
        }
        
        aiSDK.emitEvent({ type: "image-generated", data: { imageUrl: response.imageUrl, imageData: response.imageData, requestId: response.requestId, imageId: response.imageId }, requiresLLMResponse: false });
      } else {
        isGenerating = false; // Reset generation flag on error
        updateStatus("Error: " + (response.error || "Unknown error"), 0xff0000);
        imageReady = false;
        // Continuous positioning loop will handle repositioning automatically
        // Force immediate reposition to ensure input stays visible even on error
        if (aiSDK && aiSDK.repositionAllInputs) {
          aiSDK.repositionAllInputs();
        }
      }
    });
  });
  
    // Attach prompt input to button using container-based positioning
    // This ensures perfect alignment and automatic scroll synchronization
    if (promptInput && requestImageButton && aiSDK && aiSDK.attachHtmlToPixiElement) {
      console.log("[SDK Test] ✅ Attaching prompt input to button using container-based positioning");
      // Use 'right' anchor to position from the right edge of the button, then add 10px spacing
      // 'right' anchor is at vertical center of button (buttonHeight/2 = 20px from top)
      // For perfect alignment, we need to account for the input's own height
      // The anchor point is at the button's center, so we offset by half the input height upward
      // to align the input's center with the button's center
      const buttonHeight = 40; // buttonHeight constant
      // Force a reflow to ensure input is measured correctly
      promptInput.style.display = 'block';
      promptInput.style.visibility = 'visible';
      // Move input up by half the button height (20px) to align with button center
      const verticalOffset = -buttonHeight / 2; // -20px to move up by half button height
      
      aiSDK.attachHtmlToPixiElement(promptInput, requestImageButton, {
        offsetX: 10, // 10px spacing after button right edge
        offsetY: verticalOffset, // Center vertically with button (negative to align centers)
        anchor: 'right', // Anchor to right edge of button for consistent alignment
        zIndex: 1000,
        updateOnTransform: true // Update position during scroll
      });
      console.log("[SDK Test] ✅ Prompt input attached to button container");
    } else {
      console.warn("[SDK Test] ⚠️ Cannot attach prompt input - missing dependencies");
    }
  
  // IMAGE RECALL SECTION - Positioned right after image generation so buttons are visible together
  yPos += 20;
  const recallLabel = new PIXI.Text("IMAGE RECALL", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  recallLabel.x = 20;
  recallLabel.y = yPos;
  app.stage.addChild(recallLabel);
  yPos += 30;
  
  // Get the HTML input fields (positioned beside buttons via CSS)
  const lessonIdInput = document.getElementById("lesson-id-input");
  const imageIdInput = document.getElementById("image-id-input");
  console.log("[SDK Test] 🔍 Looking for lesson-id-input:", !!lessonIdInput, "image-id-input:", !!imageIdInput);
  if (!lessonIdInput) {
    console.warn("[SDK Test] ⚠️ Lesson ID input field not found. Make sure HTML code includes input element with id lesson-id-input");
  } else {
    console.log("[SDK Test] ✅ Found lesson-id-input, current style:", {
      position: lessonIdInput.style.position,
      left: lessonIdInput.style.left,
      top: lessonIdInput.style.top,
      visibility: lessonIdInput.style.visibility,
      display: lessonIdInput.style.display
    });
  }
  if (!imageIdInput) {
    console.warn("[SDK Test] ⚠️ Image ID input field not found. Make sure HTML code includes input element with id image-id-input");
  } else {
    console.log("[SDK Test] ✅ Found image-id-input, current style:", {
      position: imageIdInput.style.position,
      left: imageIdInput.style.left,
      top: imageIdInput.style.top,
      visibility: imageIdInput.style.visibility,
      display: imageIdInput.style.display
    });
  }
  
  // Load existing image IDs when interaction loads (after SDK is ready)
  function loadLessonImageIds() {
    aiSDK.getLessonImageIds(null, null, (imageIds, error) => {
      if (error) {
        console.warn("[SDK Test] Could not load lesson image IDs:", error);
        return;
      }
      if (imageIds && imageIds.length > 0) {
        lessonImageIds = imageIds;
        console.log("[SDK Test] Loaded existing image IDs:", lessonImageIds);
        // Update display after a small delay to ensure buttons are created first
        setTimeout(() => {
          updateImageIdsDisplay();
        }, 1000);
      }
    });
  }
  
  // Wait for SDK to be ready before loading image IDs
  aiSDK.isReady(() => {
    setTimeout(loadLessonImageIds, 1000); // Delay to ensure buttons are created first
  });
  
  // Create button with input fields beside it
  const getLessonImagesButton = createButton("Get Lesson Images", () => {
    // Remove any displayed image sprite FIRST, before loading gallery
    if (displayedImageSprite) {
      console.log("[SDK Test] 🗑️ Removing displayed image before showing gallery");
      app.stage.removeChild(displayedImageSprite);
      displayedImageSprite = null;
    }
    
    const lessonId = lessonIdInput && lessonIdInput.value.trim() ? lessonIdInput.value.trim() : null;
    const imageId = imageIdInput && imageIdInput.value.trim() ? imageIdInput.value.trim() : null;
    const accountId = null; // Use current user's account (null means all accounts for this lesson)
    updateStatus("Loading lesson images...", 0xffff00);
    console.log("[SDK Test] Getting lesson images, lessonId:", lessonId, "imageId:", imageId, "accountId:", accountId);
    
    // First, reload image IDs to ensure we have the complete list
    aiSDK.getLessonImageIds(lessonId, accountId, (imageIds, error) => {
      if (error) {
        console.warn("[SDK Test] Could not reload lesson image IDs:", error);
      } else {
        lessonImageIds = imageIds || [];
        console.log("[SDK Test] Reloaded image IDs:", lessonImageIds.length, "IDs");
        // Update image IDs display
        updateImageIdsDisplay();
      }
      
      // Then get the images
      aiSDK.getLessonImages(lessonId, accountId, imageId, (images, error) => {
        if (error) {
          console.error("[SDK Test] Error getting lesson images:", error);
          updateStatus("Error: " + error, 0xff0000);
          return;
        }
        recalledImages = images || [];
        console.log("[SDK Test] Retrieved images:", recalledImages.length, recalledImages);
        updateStatus("Found " + recalledImages.length + " image(s)", 0x00ff00);
        
        // Display gallery - container-based positioning handles alignment automatically
        displayImageGallery(() => {
          // Gallery is fully rendered
          // Container-based positioning handles repositioning automatically
        });
      });
    });
  });
  
  // Attach input fields to button using container-based positioning for consistency
  // This ensures all inputs are aligned horizontally and scroll together
  if (lessonIdInput && getLessonImagesButton && aiSDK && aiSDK.attachHtmlToPixiElement) {
    console.log("[SDK Test] ✅ Attaching lesson ID input to button using container-based positioning");
    // Use 'right' anchor to position from the right edge of the button, then add 10px spacing
    // Calculate vertical offset to center input with button
    const buttonHeight = 40; // buttonHeight constant
    lessonIdInput.style.display = 'block';
    lessonIdInput.style.visibility = 'visible';
    // Move input up by half the button height (20px) to align with button center
    const verticalOffset = -buttonHeight / 2; // -20px to move up by half button height
    
    aiSDK.attachHtmlToPixiElement(lessonIdInput, getLessonImagesButton, {
      offsetX: 10, // 10px spacing after button right edge (same as prompt input)
      offsetY: verticalOffset, // Center vertically with button (negative to align centers)
      anchor: 'right', // Anchor to right edge of button for consistent alignment
      zIndex: 1000,
      updateOnTransform: true // Update position during scroll
    });
    console.log("[SDK Test] ✅ Lesson ID input attached to button container");
  } else {
    console.warn("[SDK Test] ⚠️ Cannot attach lesson ID input - missing dependencies");
  }
  
  if (imageIdInput && getLessonImagesButton && aiSDK && aiSDK.attachHtmlToPixiElement) {
    console.log("[SDK Test] ✅ Attaching image ID input to button using container-based positioning");
    // Use 'right' anchor to position from the right edge of the button, then add 10px spacing
    // Position below lesson ID input (which is at button center, so add input height + spacing)
    const buttonHeight = 40; // buttonHeight constant
    lessonIdInput.style.display = 'block';
    lessonIdInput.style.visibility = 'visible';
    imageIdInput.style.display = 'block';
    imageIdInput.style.visibility = 'visible';
    const lessonInputHeight = lessonIdInput ? (lessonIdInput.offsetHeight || 28) : 28;
    const imageInputHeight = imageIdInput.offsetHeight || 28;
    // Position below lesson ID input: button center + half lesson input height + spacing + half image input height
    const verticalOffset = lessonInputHeight / 2 + 2 + imageInputHeight / 2;
    
    aiSDK.attachHtmlToPixiElement(imageIdInput, getLessonImagesButton, {
      offsetX: 10, // 10px spacing after button right edge (same as prompt input)
      offsetY: verticalOffset, // Position below lesson ID input
      anchor: 'right', // Anchor to right edge of button for consistent alignment
      zIndex: 1000,
      updateOnTransform: true // Update position during scroll
    });
    console.log("[SDK Test] ✅ Image ID input attached to button container");
  } else {
    console.warn("[SDK Test] ⚠️ Cannot attach image ID input - missing dependencies");
  }
  
  // Inputs are now attached using container-based positioning above
  // No need for setTimeout calls - positioning happens automatically
  
  if (!lessonIdInput || !getLessonImagesButton) {
    console.warn("[SDK Test] ⚠️ Missing inputs or button - lessonIdInput:", !!lessonIdInput, "imageIdInput:", !!imageIdInput, "getLessonImagesButton:", !!getLessonImagesButton);
    if (lessonIdInput) lessonIdInput.style.visibility = "visible";
    if (imageIdInput) imageIdInput.style.visibility = "visible";
  }
  
  // Add button to refresh image IDs list
  createButton("Refresh Image IDs", () => {
    const lessonId = lessonIdInput && lessonIdInput.value.trim() ? lessonIdInput.value.trim() : null;
    const accountId = null; // Use current user's account (null means all accounts for this lesson)
    updateStatus("Refreshing image IDs...", 0xffff00);
    console.log("[SDK Test] Refreshing lesson image IDs, lessonId:", lessonId, "accountId:", accountId);
    aiSDK.getLessonImageIds(lessonId, accountId, (imageIds, error) => {
      if (error) {
        console.error("[SDK Test] Error getting lesson image IDs:", error);
        updateStatus("Error: " + error, 0xff0000);
        return;
      }
      lessonImageIds = imageIds || [];
      console.log("[SDK Test] Retrieved image IDs:", lessonImageIds);
      updateStatus("Found " + lessonImageIds.length + " image ID(s)", 0x00ff00);
      updateImageIdsDisplay();
    });
  });
  
  // Add button to delete image with input field
  const deleteImageIdInput = document.getElementById("delete-image-id-input");
  const deleteImageButton = createButton("Delete Image", () => {
    const imageIdToDelete = deleteImageIdInput && deleteImageIdInput.value.trim() ? deleteImageIdInput.value.trim() : null;
    if (!imageIdToDelete) {
      updateStatus("Please enter an image ID to delete", 0xff0000);
      return;
    }
    updateStatus("Deleting image...", 0xffff00);
    console.log("[SDK Test] Deleting image, imageId:", imageIdToDelete);
    aiSDK.deleteImage(imageIdToDelete, (result, error) => {
      if (error || !result.success) {
        console.error("[SDK Test] Error deleting image:", error || result.error);
        updateStatus("Error: " + (error || result.error || "Failed to delete image"), 0xff0000);
        return;
      }
      console.log("[SDK Test] Image deleted successfully:", imageIdToDelete);
      updateStatus("Image deleted successfully", 0x00ff00);
      // Clear the input field
      if (deleteImageIdInput) {
        deleteImageIdInput.value = "";
      }
      // Remove from local arrays if present
      lessonImageIds = lessonImageIds.filter(id => id !== imageIdToDelete);
      recalledImages = recalledImages.filter(img => img.id !== imageIdToDelete);
      // Refresh displays
      updateImageIdsDisplay();
      // If gallery is showing, refresh it
      if (imageGalleryContainer) {
        displayImageGallery();
      }
    });
  });
  
  // Attach delete image input field to button using container-based positioning
  if (deleteImageIdInput && deleteImageButton && aiSDK && aiSDK.attachHtmlToPixiElement) {
    console.log("[SDK Test] ✅ Attaching delete image ID input to button using container-based positioning");
    // Use 'right' anchor to position from the right edge of the button, then add 10px spacing
    // Calculate vertical offset to center input with button
    const buttonHeight = 40; // buttonHeight constant
    deleteImageIdInput.style.display = 'block';
    deleteImageIdInput.style.visibility = 'visible';
    // Move input up by half the button height (20px) to align with button center
    const verticalOffset = -buttonHeight / 2; // -20px to move up by half button height
    
    aiSDK.attachHtmlToPixiElement(deleteImageIdInput, deleteImageButton, {
      offsetX: 10, // 10px spacing after button right edge (same as other inputs)
      offsetY: verticalOffset, // Center vertically with button (negative to align centers)
      anchor: 'right', // Anchor to right edge of button for consistent alignment
      zIndex: 1000,
      updateOnTransform: true // Update position during scroll
    });
    console.log("[SDK Test] ✅ Delete image ID input attached to button container");
  } else {
    console.warn("[SDK Test] ⚠️ Cannot attach delete image ID input - missing dependencies");
  }
  
  // Function to load and display image in PixiJS canvas
  function loadAndDisplayImage(imageSource) {
    if (!imageSource) {
      console.error("[SDK Test] ❌ loadAndDisplayImage called with no image source");
      updateStatus("Error: No image data to display", 0xff0000);
      return;
    }
    
    console.log("[SDK Test] 🖼️ Loading image from source:", imageSource.substring(0, 50) + "...");
    const dataUrl = imageSource.startsWith("data:") ? imageSource : (imageSource.startsWith("http") ? imageSource : "data:image/png;base64," + imageSource);
    
    PIXI.Assets.load(dataUrl).then((texture) => {
      console.log("[SDK Test] ✅ Image texture loaded, dimensions:", texture.width, "x", texture.height);
      
      // Remove old image if exists
      if (displayedImageSprite) {
        app.stage.removeChild(displayedImageSprite);
        displayedImageSprite = null;
      }
      
      // Create sprite with max dimensions
      const maxWidth = Math.min(window.innerWidth - 40, 600);
      const maxHeight = 400;
      let spriteWidth = texture.width;
      let spriteHeight = texture.height;
      const aspectRatio = texture.width / texture.height;
      if (spriteWidth > maxWidth) {
        spriteWidth = maxWidth;
        spriteHeight = spriteWidth / aspectRatio;
      }
      if (spriteHeight > maxHeight) {
        spriteHeight = maxHeight;
        spriteWidth = spriteHeight * aspectRatio;
      }
      
      displayedImageSprite = new PIXI.Sprite(texture);
      displayedImageSprite.width = spriteWidth;
      displayedImageSprite.height = spriteHeight;
      displayedImageSprite.x = 20;
      
      // Position image below the lowest element with safe spacing to prevent overlap
      const lowestBottom = getLowestElementBottom();
      const imageY = Math.max(yPos + 50, lowestBottom + 20); // 20px spacing after lowest element
      displayedImageSprite.y = imageY;
      app.stage.addChild(displayedImageSprite);
      
      // Store image state for restoration after viewport changes (both in memory and localStorage)
      storedImageState = {
        url: imageSource,
        x: displayedImageSprite.x,
        y: displayedImageSprite.y,
        width: spriteWidth,
        height: spriteHeight
      };
      
      // Also store in localStorage for persistence across reinitializations
      try {
        localStorage.setItem('sdk-test-image-state', JSON.stringify(storedImageState));
        console.log("[SDK Test] ✅ Image state stored in localStorage:", storedImageState);
      } catch (e) {
        console.warn("[SDK Test] ⚠️ Could not store image state in localStorage:", e);
      }
      
      console.log("[SDK Test] ✅ Image displayed at position:", displayedImageSprite.x, displayedImageSprite.y, "size:", spriteWidth, "x", spriteHeight);
      
      // Resize canvas to fit image
      const currentHeight = app.screen.height;
      const newHeight = Math.max(currentHeight, displayedImageSprite.y + displayedImageSprite.height + 100);
      app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
      
      // Force a render to ensure image is visible
      app.render();
      
      updateStatus("Image displayed successfully", 0x00ff00);
    }).catch((error) => {
      console.error("[SDK Test] ❌ Error loading image:", error);
      updateStatus("Error loading image: " + (error.message || "Unknown error"), 0xff0000);
      imageReady = false;
      isGenerating = false; // Reset generation flag on error
    });
  }
  
  const displayImageButton = createButton("Display Image (Not Ready)", () => {
    if (!imageReady) {
      updateStatus("Image not ready yet. Request image first.", 0xff0000);
      return;
    }
    if (generatedImageUrl) {
      loadAndDisplayImage(generatedImageUrl);
    } else if (generatedImageData) {
      loadAndDisplayImage(generatedImageData);
    } else {
      updateStatus("No image to display", 0xff0000);
    }
  });
  
  function updateDisplayButtonText() {
    if (displayImageButton && displayImageButton.children && displayImageButton.children[1]) {
      const label = displayImageButton.children[1];
      if (imageReady) {
        label.text = "Display Image (Ready)";
        label.style.fill = 0x00ff00;
      } else {
        label.text = "Display Image (Not Ready)";
        label.style.fill = 0x0f0f23;
      }
    }
  }
  setInterval(updateDisplayButtonText, 500);
  
  function displayImageGallery(callback) {
    // Remove old gallery if exists
    if (imageGalleryContainer) {
      app.stage.removeChild(imageGalleryContainer);
      imageGalleryContainer = null;
    }
    
    // Remove any displayed image sprite first (so gallery doesn't show on top of it)
    if (displayedImageSprite) {
      app.stage.removeChild(displayedImageSprite);
      displayedImageSprite = null;
    }
    
    if (recalledImages.length === 0) {
      updateStatus("No images found for this lesson", 0xffff00);
      return;
    }
    
    // Use getLowestElementBottom() to naturally prevent overlapping
    // This calculates the bottom of the lowest visible element (buttons, image IDs, displayed image, etc.)
    // This is the "natural way" to prevent PixiJS containers from overlapping
    const lowestBottom = getLowestElementBottom();
    const galleryStartY = lowestBottom + 20; // 20px spacing after lowest element to prevent overlap
    
    // Create container for gallery
    imageGalleryContainer = new PIXI.Container();
    imageGalleryContainer.x = 20;
    imageGalleryContainer.y = galleryStartY;
    
    // Add a title for the gallery with more spacing
    const galleryTitle = new PIXI.Text("Recalled Images (" + recalledImages.length + ")", { 
      fontSize: 16, 
      fill: 0x00d4ff, 
      fontWeight: "bold" 
    });
    galleryTitle.x = 0;
    galleryTitle.y = 0;
    imageGalleryContainer.addChild(galleryTitle);
    
    let galleryY = 50; // Increased from 40 to 50 - even more space below title to prevent overlap
    const imageSpacing = 10;
    const maxImagesPerRow = 3;
    const imageSize = 200;
    let currentX = 0;
    let currentY = galleryY; // Start below title with more spacing
    
    // Track how many images have loaded
    let imagesLoaded = 0;
    const totalImages = recalledImages.length;
    
    // If no images, call callback immediately
    if (totalImages === 0 && callback) {
      callback();
      return;
    }
    
    recalledImages.forEach((image, index) => {
      // Create background for image (will be resized later to fit all text)
      const bg = new PIXI.Graphics();
      bg.beginFill(0x1a1a2e, 0.8);
      bg.drawRect(0, 0, imageSize + 20, imageSize + 100); // Increased initial height for text with spacing
      bg.endFill();
      
      // Load and display image
      const imageUrl = image.imageUrl || image.imageData;
      if (imageUrl) {
        const dataUrl = imageUrl.startsWith("data:") ? imageUrl : (imageUrl.startsWith("http") ? imageUrl : "data:image/png;base64," + imageUrl);
        PIXI.Assets.load(dataUrl).then((texture) => {
          const sprite = new PIXI.Sprite(texture);
          const aspectRatio = texture.width / texture.height;
          let spriteWidth = imageSize;
          let spriteHeight = imageSize / aspectRatio;
          if (spriteHeight > imageSize) {
            spriteHeight = imageSize;
            spriteWidth = imageSize * aspectRatio;
          }
          sprite.width = spriteWidth;
          sprite.height = spriteHeight;
          sprite.x = 10;
          sprite.y = 10;
          
          // Add prompt text below image with more spacing to prevent overlap
          const promptText = image.prompt ? (image.prompt.substring(0, 25) + "...") : "No prompt"; // Reduced from 30 to 25 chars to prevent wrapping
          const promptLabel = new PIXI.Text(promptText, { fontSize: 10, fill: 0xffffff, wordWrap: false }); // Disabled wordWrap to prevent overlap
          promptLabel.x = 10;
          promptLabel.y = sprite.y + sprite.height + 15; // Increased from 10 to 15 - more space below image
          
          // Add dimensions text with more spacing
          const dimsText = image.width && image.height ? image.width + "x" + image.height : "Unknown size";
          const dimsLabel = new PIXI.Text(dimsText, { fontSize: 9, fill: 0x00d4ff });
          dimsLabel.x = 10;
          dimsLabel.y = promptLabel.y + promptLabel.height + 8; // Increased from 5 to 8 - more space between prompt and dimensions
          
          // Add image ID label below dimensions with more spacing to prevent overlap
          const imageIdText = image.id ? ("ID: " + image.id.substring(0, 8) + "...") : "ID: N/A";
          const imageIdLabel = new PIXI.Text(imageIdText, {
            fontSize: 9,
            fill: 0xcccccc
          });
          imageIdLabel.x = 10;
          imageIdLabel.y = dimsLabel.y + dimsLabel.height + 8; // Increased from 5 to 8 - more space between dimensions and ID
          
          // Update background height to fit all text (recreate it with correct height)
          // Calculate total height needed: image + spacing + all text labels
          const totalTextHeight = imageIdLabel.y + imageIdLabel.height + 10; // Increased padding at bottom from 5 to 10
          bg.clear();
          bg.beginFill(0x1a1a2e, 0.8);
          bg.drawRect(0, 0, imageSize + 20, Math.max(imageSize + 120, totalTextHeight + 10)); // Increased min height from 100 to 120, padding from 5 to 10
          bg.endFill();
          
          const imageContainer = new PIXI.Container();
          imageContainer.addChild(bg);
          imageContainer.addChild(sprite);
          imageContainer.addChild(promptLabel);
          imageContainer.addChild(dimsLabel);
          imageContainer.addChild(imageIdLabel);
          imageContainer.x = currentX;
          imageContainer.y = currentY;
          
          imageGalleryContainer.addChild(imageContainer);
          
          // Update position for next image (with extra space for all text labels)
          currentX += imageSize + 30;
          if ((index + 1) % maxImagesPerRow === 0) {
            currentX = 0;
            currentY += imageSize + 110; // Increased from 90 to 110 - more space between rows to prevent overlap
          }
          
          // Check if all images have loaded
          imagesLoaded++;
          if (imagesLoaded === totalImages) {
            // Force a render to ensure all images are rendered
            app.render();
            // Resize canvas to fit gallery after all images are loaded
            setTimeout(() => {
              resizeCanvasToFitContent();
              if (callback) callback();
            }, 100);
          }
        }).catch((error) => {
          console.error("[SDK Test] Failed to load recalled image:", error);
          // Still count as loaded to avoid hanging
          imagesLoaded++;
          if (imagesLoaded === totalImages) {
            app.render();
            setTimeout(() => {
              resizeCanvasToFitContent();
              if (callback) callback();
            }, 100);
          }
        });
      }
    });
    
    app.stage.addChild(imageGalleryContainer);
    
    // Ensure the container overflow is set to hidden to prevent double scrollbars
    const container = document.getElementById('pixi-container');
    if (container) {
      container.style.overflow = 'hidden'; // Prevent double scrollbars - scrolling handled by parent
      container.style.height = '100%';
    }
    
    // Canvas will be resized after all images load (in the image loading callback)
  }
  
  yPos += 20;
  
  // CORE METHODS SECTION
  const coreLabel = new PIXI.Text("CORE METHODS", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  coreLabel.x = 20;
  coreLabel.y = yPos;
  app.stage.addChild(coreLabel);
  yPos += 30;
  createButton("Emit Event", () => {
    aiSDK.emitEvent({ type: "user-selection", data: { test: true, timestamp: Date.now() }, requiresLLMResponse: true });
    updateStatus("Event emitted", 0x00ff00);
  });
  createButton("Update State", () => {
    aiSDK.updateState("testKey", { value: Math.random(), timestamp: Date.now() });
    updateStatus("State updated", 0x00ff00);
  });
  createButton("Get State", () => {
    aiSDK.getState((state) => { updateStatus("State: " + JSON.stringify(state).substring(0, 50), 0x00ff00); });
  });
  yPos += 20;
  const uiLabel = new PIXI.Text("UI CONTROL METHODS", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  uiLabel.x = 20;
  uiLabel.y = yPos;
  app.stage.addChild(uiLabel);
  yPos += 30;
  createButton("Minimize Chat UI", () => { aiSDK.minimizeChatUI(); updateStatus("Chat UI minimized", 0x00ff00); });
  createButton("Show Chat UI", () => { aiSDK.showChatUI(); updateStatus("Chat UI shown", 0x00ff00); });
  createButton("Activate Fullscreen", () => { aiSDK.activateFullscreen(); updateStatus("Fullscreen activated", 0x00ff00); });
  createButton("Deactivate Fullscreen", () => { aiSDK.deactivateFullscreen(); updateStatus("Fullscreen deactivated", 0x00ff00); });
  createButton("Post to Chat", () => {
    aiSDK.postToChat("Test message from SDK Test interaction!", "assistant", true);
    updateStatus("Posted to chat", 0x00ff00);
  });
  createButton("Show Script", () => {
    aiSDK.showScript("This is a test script block.", true);
    updateStatus("Script shown", 0x00ff00);
  });
  createButton("Show Snack (5s)", () => {
    aiSDK.showSnack("Test snack message!", 5000, false, (snackId) => { updateStatus("Snack shown: " + snackId, 0x00ff00); });
  });
  createButton("Hide Snack", () => { aiSDK.hideSnack(); updateStatus("Snack hidden", 0x00ff00); });
  yPos += 20;
  const dataLabel = new PIXI.Text("DATA STORAGE METHODS", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  dataLabel.x = 20;
  dataLabel.y = yPos;
  app.stage.addChild(dataLabel);
  yPos += 30;
  createButton("Save Instance Data", () => {
    aiSDK.saveInstanceData({ testValue: Math.random(), timestamp: Date.now() }, (success, error) => {
      if (success) updateStatus("Instance data saved", 0x00ff00);
      else updateStatus("Error: " + error, 0xff0000);
    });
  });
  createButton("Get Instance Data History", () => {
    aiSDK.getInstanceDataHistory({ limit: 10 }, (data, error) => {
      if (data) updateStatus("History: " + data.length + " records", 0x00ff00);
      else updateStatus("Error: " + error, 0xff0000);
    });
  });
  createButton("Save User Progress", () => {
    aiSDK.saveUserProgress({ score: Math.floor(Math.random() * 100), completed: false }, (progress, error) => {
      if (progress) updateStatus("Progress saved. Attempts: " + progress.attempts, 0x00ff00);
      else updateStatus("Error: " + error, 0xff0000);
    });
  });
  createButton("Get User Progress", () => {
    aiSDK.getUserProgress((progress, error) => {
      if (progress) updateStatus("Progress: Attempts=" + progress.attempts + ", Completed=" + progress.completed, 0x00ff00);
      else if (error) updateStatus("Error: " + error, 0xff0000);
      else updateStatus("No progress found", 0xffff00);
    });
  });
  createButton("Mark Completed", () => {
    aiSDK.markCompleted((progress, error) => {
      if (progress) updateStatus("Marked as completed", 0x00ff00);
      else updateStatus("Error: " + error, 0xff0000);
    });
  });
  createButton("Increment Attempts", () => {
    aiSDK.incrementAttempts((progress, error) => {
      if (progress) updateStatus("Attempts: " + progress.attempts, 0x00ff00);
      else updateStatus("Error: " + error, 0xff0000);
    });
  });
  createButton("Get User Public Profile", () => {
    aiSDK.getUserPublicProfile(undefined, (profile, error) => {
      if (profile) updateStatus("Profile: " + (profile.displayName || "No name"), 0x00ff00);
      else if (error) updateStatus("Error: " + error, 0xff0000);
      else updateStatus("No profile found", 0xffff00);
    });
  });
  
  statusYPos = yPos + 20;
  statusTextInitialized = true;
  updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", 0xffff00);
  const contentHeight = statusYPos + 100;
  const minHeight = Math.max(window.innerHeight, 600);
  const finalHeight = Math.max(contentHeight, minHeight);
  app.renderer.resize(Math.max(window.innerWidth, 800), finalHeight);
  
  // Handle window/canvas resize - reposition inputs dynamically using SDK utility
  window.addEventListener("resize", () => {
    const newWidth = Math.max(window.innerWidth, 800);
    const contentBasedHeight = Math.max(statusYPos + 100, Math.max(window.innerHeight, 600));
    app.renderer.resize(newWidth, contentBasedHeight);
    if (statusText) statusText.style.wordWrapWidth = newWidth - 40;
    // Continuous positioning loop will handle repositioning automatically
  });
  
  // Also handle canvas resize events from PixiJS
  app.renderer.on("resize", () => {
    // Force immediate reposition (continuous loop will maintain it)
    if (aiSDK && aiSDK.repositionAllInputs) {
      aiSDK.repositionAllInputs();
    }
  });
  
  // Ensure continuous positioning loop is running
  if (aiSDK && aiSDK.startPositioningLoop) {
    aiSDK.startPositioningLoop();
  }
  
  // Initial positioning after everything is rendered
  // Continuous positioning loop will handle this automatically, but do an initial positioning
  setTimeout(() => {
    console.log("[SDK Test] Running initial repositionAllInputs()");
    try {
      if (aiSDK && aiSDK.repositionAllInputs) {
        aiSDK.repositionAllInputs();
      }
      // Ensure continuous positioning loop is running
      if (aiSDK && aiSDK.startPositioningLoop) {
        aiSDK.startPositioningLoop();
      }
      console.log("[SDK Test] ✅ Initial repositionAllInputs() completed, continuous loop started");
    } catch (e) {
      console.error("[SDK Test] ❌ Error in initial repositionAllInputs():", e);
    }
  }, 100);
  
  // Fallback: Make inputs visible even if positioning fails (after 200ms)
  setTimeout(() => {
    const promptInput = document.getElementById("image-prompt-input");
    const lessonIdInput = document.getElementById("lesson-id-input");
    const imageIdInput = document.getElementById("image-id-input");
    if (promptInput && promptInput.style.visibility === "hidden") {
      console.warn("[SDK Test] ⚠️ Image prompt input still hidden after 200ms, making visible at fallback position");
      promptInput.style.visibility = "visible";
    }
    if (lessonIdInput && lessonIdInput.style.visibility === "hidden") {
      console.warn("[SDK Test] ⚠️ Lesson ID input still hidden after 200ms, making visible at fallback position");
      lessonIdInput.style.visibility = "visible";
    }
    if (imageIdInput && imageIdInput.style.visibility === "hidden") {
      console.warn("[SDK Test] ⚠️ Image ID input still hidden after 200ms, making visible at fallback position");
      imageIdInput.style.visibility = "visible";
    }
  }, 200);
  if (!isPreviewMode) {
    aiSDK.isReady((ready) => {
      sdkReady = ready;
      updateStatus("SDK Ready: " + ready, ready ? 0x00ff00 : 0xff0000);
    });
    aiSDK.onResponse((response) => {
      updateStatus("AI Response: " + (response.response || "No text"), 0x00d4ff);
    });
  } else {
    sdkReady = true;
    updateStatus("Preview Mode - SDK features limited", 0xffff00);
  }
  app.render();
}`;

    const existing = await this.interactionTypeRepository.findOne({
      where: { id: 'sdk-test-pixijs' },
    });

    if (existing) {
      // Update existing interaction
      // Use save() instead of update() to ensure large text fields are persisted correctly
      console.log('[InteractionTypes] About to update - jsCode length:', jsCode.length);
      console.log('[InteractionTypes] jsCode includes debug log:', jsCode.includes('Looking for image-prompt-input'));
      
      // Validate JavaScript syntax before saving
      try {
        new Function(jsCode);
        console.log('[InteractionTypes] JavaScript syntax validation passed');
      } catch (e) {
        console.error('[InteractionTypes] JavaScript syntax validation failed:', e.message);
        // Try to extract line/column from error message
        const lineMatch = e.message.match(/line (\d+):(\d+)/);
        if (lineMatch) {
          const lineNum = parseInt(lineMatch[1]);
          const colNum = parseInt(lineMatch[2]);
          const lines = jsCode.split('\n');
          if (lineNum <= lines.length) {
            const errorLine = lines[lineNum - 1];
            console.error('[InteractionTypes] Error at line', lineNum, 'column', colNum);
            console.error('[InteractionTypes] Line content:', errorLine);
            console.error('[InteractionTypes] Error context:', errorLine.substring(Math.max(0, colNum - 20), colNum + 20));
          }
        }
        // Also check for common syntax errors
        const lines = jsCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Check for unclosed parentheses in function calls
          const openParens = (line.match(/\(/g) || []).length;
          const closeParens = (line.match(/\)/g) || []).length;
          if (openParens > closeParens && line.includes('(') && !line.includes('//')) {
            console.error('[InteractionTypes] Potential unclosed parenthesis at line', i + 1, ':', line.substring(0, 100));
          }
        }
        throw new Error(`Invalid JavaScript syntax in interaction code: ${e.message}`);
      }
      
      existing.jsCode = jsCode;
      existing.htmlCode = '<div id="pixi-container"></div><input type="text" id="image-prompt-input" placeholder="Image prompt..." style="width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 20px; visibility: hidden;" /><input type="text" id="lesson-id-input" placeholder="Lesson ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 50px; visibility: hidden;" /><input type="text" id="image-id-input" placeholder="Image ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 80px; visibility: hidden;" /><input type="text" id="delete-image-id-input" placeholder="Image ID to delete" style="width: 200px; padding: 8px; border: 2px solid #ff4444; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 110px; visibility: hidden;" />';
      existing.cssCode = '#pixi-container { width: 100%; height: 100%; overflow: hidden; position: relative; } #image-prompt-input, #lesson-id-input, #image-id-input, #delete-image-id-input { font-family: inherit; }';
      existing.description = 'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, responses, and image generation.';
      console.log('[InteractionTypes] Calling save() with jsCode length:', existing.jsCode.length);
      const saved = await this.interactionTypeRepository.save(existing);
      console.log('[InteractionTypes] Save() completed, saved entity jsCode length:', saved.jsCode?.length);
      console.log('[InteractionTypes] Updated SDK Test PixiJS interaction with image generation code and HTML/CSS');
      console.log('[InteractionTypes] Verifying update - checking jsCode contains string concatenation...');
      // Reload to get the updated entity
      const updated = await this.interactionTypeRepository.findOne({ where: { id: 'sdk-test-pixijs' } });
      if (updated && updated.jsCode) {
        const hasTemplateLiteral = updated.jsCode.includes('`req-${Date.now()');
        const hasStringConcat = updated.jsCode.includes("'req-' + Date.now()");
        console.log('[InteractionTypes] Database check - hasTemplateLiteral:', hasTemplateLiteral, 'hasStringConcat:', hasStringConcat);
        if (hasTemplateLiteral && !hasStringConcat) {
          console.error('[InteractionTypes] ERROR: Database still has template literals! Update may have failed.');
        } else if (hasStringConcat) {
          console.log('[InteractionTypes] Database correctly updated with string concatenation');
        }
      }
      return updated || saved || existing;
    } else {
      // Create new if doesn't exist
      const sdkTest = this.interactionTypeRepository.create({
        id: 'sdk-test-pixijs',
        name: 'SDK Test - PixiJS',
        category: 'absorb-show',
        description: 'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, responses, and image generation.',
        schema: {},
        generationPrompt: 'This is a test interaction for SDK functionality.',
        interactionTypeCategory: 'pixijs',
        htmlCode: '<div id="pixi-container"></div><input type="text" id="image-prompt-input" placeholder="Image prompt..." style="width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 20px; visibility: hidden;" /><input type="text" id="lesson-id-input" placeholder="Lesson ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 50px; visibility: hidden;" /><input type="text" id="image-id-input" placeholder="Image ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 80px; visibility: hidden;" />',
        cssCode: '#pixi-container { width: 100%; height: 100%; overflow: hidden; position: relative; } #image-prompt-input, #lesson-id-input, #image-id-input { font-family: inherit; }',
        jsCode: jsCode,
        configSchema: {
          fields: [],
        },
        sampleData: {
          message: 'This is a test interaction for SDK functionality.',
        },
        isActive: true,
      } as any);

      await this.interactionTypeRepository.save(sdkTest);
      console.log('[InteractionTypes] ✅ Created SDK Test PixiJS interaction with image generation code');
      return sdkTest;
    }
  }

  async findAll(): Promise<InteractionType[]> {
    return this.interactionTypeRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<InteractionType | null> {
    return this.interactionTypeRepository.findOne({ where: { id } });
  }

  async create(dto: any): Promise<InteractionType> {
    const interactionType = this.interactionTypeRepository.create(dto);
    const saved = await this.interactionTypeRepository.save(interactionType);
    // TypeORM save can return array or single entity, ensure we return single
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: string, dto: any): Promise<InteractionType> {
    await this.interactionTypeRepository.update(id, dto);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new Error(`Interaction type ${id} not found`);
    }
    return updated;
  }

  async validateOutput(typeId: string, output: any): Promise<boolean> {
    const type = await this.findOne(typeId);
    if (!type) return false;

    // TODO: Implement Zod validation against type.schema
    // For now, just check basic structure
    return output && typeof output === 'object';
  }

  async uploadDocument(interactionId: string, file: any): Promise<{ success: boolean; data: { url: string; fileName: string } }> {
    const interaction = await this.findOne(interactionId);
    if (!interaction) {
      throw new NotFoundException(`Interaction type ${interactionId} not found`);
    }

    // Delete old document if exists
    if (interaction.iframeDocumentUrl) {
      try {
        await this.fileStorageService.deleteFile(interaction.iframeDocumentUrl);
      } catch (error) {
        // Log but don't fail if old file doesn't exist
        console.warn(`Failed to delete old document: ${error}`);
      }
    }

    // Save new file
    const { url, fileName } = await this.fileStorageService.saveFile(file, 'interaction-documents');

    // Update interaction
    await this.interactionTypeRepository.update(interactionId, {
      iframeDocumentUrl: url,
      iframeDocumentFileName: fileName,
    });

    return {
      success: true,
      data: { url, fileName },
    };
  }

  /**
   * Update config schema for existing interactions to include new fields
   * This ensures backward compatibility when new config options are added
   */
  async updateConfigSchemaForExistingInteractions() {
    const interactionsToUpdate = [
      'sdk-test-html',
      'sdk-test-iframe',
      'sdk-test-media-player',
      'sdk-test-video-url',
      'sdk-test-pixijs',
    ];

    const newConfigSchema = {
      fields: [
        {
          key: 'goFullscreenOnLoad',
          type: 'boolean',
          label: 'Go to fullscreen on load',
          default: false,
          description: 'Automatically activate fullscreen mode when the interaction loads'
        },
        {
          key: 'showAiTeacherUiOnLoad',
          type: 'boolean',
          label: 'Show AI Teacher UI on load',
          default: false,
          description: 'Automatically show the AI Teacher UI when the interaction loads. If false (default), the UI will remain minimized.'
        }
      ]
    };

    for (const interactionId of interactionsToUpdate) {
      const existing = await this.interactionTypeRepository.findOne({
        where: { id: interactionId },
      });

      if (existing) {
        // Parse existing config schema
        let existingSchema: any = {};
        if (existing.configSchema && typeof existing.configSchema === 'string') {
          try {
            existingSchema = JSON.parse(existing.configSchema);
          } catch (e) {
            console.warn(`[InteractionTypes] Failed to parse configSchema for ${interactionId}, using empty schema`);
          }
        } else if (existing.configSchema) {
          existingSchema = existing.configSchema;
        }

        // Merge new fields into existing schema
        const existingFields = existingSchema.fields || [];
        const newFields = newConfigSchema.fields;
        
        // Check if showAiTeacherUiOnLoad already exists
        const hasShowAiTeacherUi = existingFields.some((f: any) => f.key === 'showAiTeacherUiOnLoad');
        
        if (!hasShowAiTeacherUi) {
          // Add new field to existing schema
          existingSchema.fields = [...existingFields, newFields[1]]; // Add showAiTeacherUiOnLoad
          
          // Update in database
          await this.interactionTypeRepository.update(
            { id: interactionId },
            { configSchema: existingSchema }
          );
          console.log(`[InteractionTypes] ✅ Updated config schema for ${interactionId} to include showAiTeacherUiOnLoad`);
        } else {
          console.log(`[InteractionTypes] ℹ️ ${interactionId} already has showAiTeacherUiOnLoad in config schema`);
        }
      } else {
        console.warn(`[InteractionTypes] ⚠️ Interaction ${interactionId} not found, skipping config schema update`);
      }
    }
  }

  async removeDocument(interactionId: string): Promise<{ success: boolean }> {
    const interaction = await this.findOne(interactionId);
    if (!interaction) {
      throw new NotFoundException(`Interaction type ${interactionId} not found`);
    }

    if (interaction.iframeDocumentUrl) {
      await this.fileStorageService.deleteFile(interaction.iframeDocumentUrl);
    }

    // Clear document fields
    await this.interactionTypeRepository.update(interactionId, {
      iframeDocumentUrl: undefined,
      iframeDocumentFileName: undefined,
    });

    return { success: true };
  }
}
