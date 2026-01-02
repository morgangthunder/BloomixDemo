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

            window.parent.postMessage(message, "*");
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
    window.parent.postMessage(message, "*");
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
    const scrollX = viewport ? viewport.pageXOffset || viewport.scrollX || 0 : 0;
    const scrollY = viewport ? viewport.pageYOffset || viewport.scrollY || 0 : 0;
    
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
    inputElement.style.position = "absolute";
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
  function repositionAllInputs() {
    inputButtonPairs.forEach(pair => {
      if (pair.input && pair.button) {
        // Get canvas element to convert canvas coordinates to screen coordinates
        const canvas = pair.input.ownerDocument.querySelector('canvas');
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        
        // Get button position in canvas coordinates
        let buttonCanvasX, buttonCanvasY;
        if (pair.button.getGlobalPosition) {
          const globalPos = pair.button.getGlobalPosition();
          buttonCanvasX = globalPos.x;
          buttonCanvasY = globalPos.y;
        } else {
          // Fallback to relative positioning
          buttonCanvasX = pair.button.x + (pair.button.buttonX || 0);
          buttonCanvasY = pair.button.y + (pair.button.buttonY || 0);
        }
        
        // Convert canvas coordinates to screen coordinates
        const buttonScreenX = canvasRect.left + buttonCanvasX;
        const buttonScreenY = canvasRect.top + buttonCanvasY;
        
        const inputX = buttonScreenX + pair.buttonWidth + 10 + pair.offsetX;
        const inputY = buttonScreenY + pair.offsetY;
        pair.input.style.left = inputX + "px";
        pair.input.style.top = inputY + "px";
      }
    });
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
    
    // Note: PixiJS renderer resize listener should be set up in the interaction code
    // where the app instance is available: app.renderer.on("resize", repositionAllInputs);
  }
  setupResizeListeners();
  
  // HTML/PixiJS Coordinate Transformation System
  // Store attached HTML elements for automatic repositioning
  const attachedHtmlElements = [];
  
  // Convert PixiJS world coordinates to HTML screen coordinates
  function convertPixiToScreen(pixiX, pixiY, pixiContainer) {
    if (!pixiContainer) {
      console.warn('[SDK] convertPixiToScreen: pixiContainer is required');
      return { x: pixiX, y: pixiY };
    }
    
    // Get the global position of the container
    const globalPos = pixiContainer.getGlobalPosition();
    const screenX = globalPos.x;
    const screenY = globalPos.y;
    
    // Account for container's local position
    return {
      x: screenX + pixiX,
      y: screenY + pixiY
    };
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
    
    const screenPos = convertPixiToScreen(
      attachment.anchorOffsetX + attachment.offsetX,
      attachment.anchorOffsetY + attachment.offsetY,
      attachment.pixiContainer
    );
    
    attachment.htmlElement.style.left = screenPos.x + 'px';
    attachment.htmlElement.style.top = screenPos.y + 'px';
  }
  
  // Update all attached HTML elements
  function updateAllAttachedHtml() {
    attachedHtmlElements.forEach(attachment => {
      if (attachment.updateOnTransform) {
        updateHtmlElementPosition(attachment);
      }
    });
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
  };
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
  container.style.overflow = 'auto';
  container.style.width = '100%';
  container.style.height = '100%';
  const aiSDK = createIframeAISDK();
  // Make aiSDK available globally for debugging
  window.aiSDK = aiSDK;
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
  let displayedImageSprite = null;
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
    
    // Check image IDs display
    if (imageIdsDisplayContainer && imageIdsDisplayContainer.y !== undefined) {
      let containerHeight = 25; // Header height
      lessonImageIds.forEach(() => {
        containerHeight += 20; // Approximate height per ID line
      });
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
  function updateImageIdsDisplay() {
    // Remove old display if exists
    if (imageIdsDisplayContainer) {
      app.stage.removeChild(imageIdsDisplayContainer);
      imageIdsDisplayContainer = null;
    }
    
    if (lessonImageIds.length === 0) {
      return; // Don't display anything if no image IDs
    }
    
    // Find current yPos (after all buttons)
    let currentYPos = yPos;
    if (imageIdsDisplayContainer && imageIdsDisplayContainer.y) {
      currentYPos = imageIdsDisplayContainer.y;
    }
    
    // Create container for image IDs display
    imageIdsDisplayContainer = new PIXI.Container();
    imageIdsDisplayContainer.x = 20;
    // Position below the lowest element with safe spacing to prevent overlap
    const lowestBottom = getLowestElementBottom();
    imageIdsDisplayContainer.y = Math.max(currentYPos + 50, lowestBottom + 40); // 40px spacing after lowest element
    
    const labelText = new PIXI.Text("Lesson Image IDs:", { fontSize: 14, fill: 0x00d4ff, fontWeight: "bold" });
    labelText.x = 0;
    labelText.y = 0;
    imageIdsDisplayContainer.addChild(labelText);
    
    let currentY = 25; // Space below label header
    lessonImageIds.forEach((imageId, index) => {
      const idText = new PIXI.Text((index + 1) + ". " + imageId, { fontSize: 12, fill: 0xffffff, wordWrap: true, wordWrapWidth: window.innerWidth - 80 });
      idText.x = 10;
      idText.y = currentY;
      imageIdsDisplayContainer.addChild(idText);
      currentY += idText.height + 8; // Increased from 5 to 8 - more space between ID lines
    });
    
    app.stage.addChild(imageIdsDisplayContainer);
    
    // Resize canvas to fit content
    const containerBottom = imageIdsDisplayContainer.y + currentY + 10;
    const currentHeight = app.screen.height;
    const newHeight = Math.max(currentHeight, containerBottom + 100);
    app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
  }
  
  // Create button with input field beside it
  console.log("[SDK Test] 🔍 Creating Request Image button, promptInput exists:", !!promptInput);
  const requestImageButton = createButton("Request Image", () => {
    imagePromptText = promptInput ? promptInput.value.trim() : "";
    if (!imagePromptText) {
      updateStatus("Please enter an image prompt first", 0xff0000);
      return;
    }
    updateStatus("Generating image...", 0xffff00);
    imageReady = false;
    generatedImageUrl = null;
    generatedImageData = null;
    // Remove displayed image, gallery, and clear image IDs display when generating new image
    if (displayedImageSprite) {
      app.stage.removeChild(displayedImageSprite);
      displayedImageSprite = null;
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
    recalledImages = []; // Clear recalled images array
    // Don't clear lessonImageIds here - we want to keep existing IDs and add the new one
    // The image IDs display will be updated when the new image ID is added
    aiSDK.generateImage({ prompt: imagePromptText, userInput: "Test input from SDK", width: 1024, height: 1024 }, (response) => {
      console.log("[SDK Test] 🔍 Image generation response:", response);
      
      // Input repositioning will happen AFTER image is loaded and displayed
      // (see loadAndDisplayImage function)
      
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
        updateStatus("Error: " + (response.error || "Unknown error"), 0xff0000);
        imageReady = false;
        // Ensure input field is still visible and properly positioned even on error
        const repositionPromptInputOnError = () => {
          const promptInput = document.getElementById("image-prompt-input");
          if (promptInput && requestImageButton) {
            try {
              if (aiSDK && aiSDK.positionInputBesideButton) {
                aiSDK.positionInputBesideButton(promptInput, requestImageButton, 0, 2, buttonWidth);
              }
              promptInput.style.visibility = "visible";
              promptInput.style.display = "block";
              promptInput.style.zIndex = "1000";
            } catch (e) {
              promptInput.style.visibility = "visible";
              promptInput.style.display = "block";
              promptInput.style.zIndex = "1000";
            }
          }
        };
        setTimeout(repositionPromptInputOnError, 200);
        setTimeout(repositionPromptInputOnError, 500);
        setTimeout(repositionPromptInputOnError, 1000);
      }
    });
  });
  
  // Position the prompt input beside the button using SDK utility
  // Use multiple timeouts to ensure button is fully rendered before positioning
  console.log("[SDK Test] 🔍 About to position image prompt input - promptInput:", !!promptInput, "requestImageButton:", !!requestImageButton, "aiSDK:", !!aiSDK);
  
  const positionPromptInput = () => {
    if (promptInput && requestImageButton && aiSDK) {
      console.log("[SDK Test] 🎯 Executing positioning for image prompt input");
      try {
        if (!aiSDK.positionInputBesideButton) {
          console.error("[SDK Test] ❌ aiSDK.positionInputBesideButton is not a function!");
          // Fallback: make input visible at current position
          promptInput.style.visibility = "visible";
          console.log("[SDK Test] ✅ Made input visible as fallback");
        } else {
          aiSDK.positionInputBesideButton(promptInput, requestImageButton, 0, 2, buttonWidth);
          promptInput.style.visibility = "visible";
          promptInput.style.display = "block";
          console.log("[SDK Test] ✅ Image prompt input positioned successfully");
        }
      } catch (e) {
        console.error("[SDK Test] ❌ Error positioning image prompt input:", e);
        // Fallback: make input visible at current position
        promptInput.style.visibility = "visible";
        promptInput.style.display = "block";
        console.log("[SDK Test] ✅ Made input visible after error");
      }
    }
  };
  
  // Try multiple times with increasing delays to ensure button is rendered
  if (promptInput && requestImageButton && aiSDK) {
    console.log("[SDK Test] ✅ All conditions met, scheduling positioning attempts");
    setTimeout(positionPromptInput, 100);
    setTimeout(positionPromptInput, 300);
    setTimeout(positionPromptInput, 500);
  } else {
    console.warn("[SDK Test] ⚠️ Cannot position image prompt input - promptInput:", !!promptInput, "requestImageButton:", !!requestImageButton, "aiSDK:", !!aiSDK);
    // Fallback: make input visible at current position
    if (promptInput) {
      promptInput.style.visibility = "visible";
      console.log("[SDK Test] ✅ Made input visible as fallback (missing dependencies)");
    }
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
        
        // Display gallery and wait for it to fully render before repositioning
        displayImageGallery(() => {
          // Gallery is fully rendered, now reposition inputs
          // Use multiple attempts with increasing delays to ensure everything is stable
          const repositionInputsAfterGallery = () => {
        if (aiSDK && aiSDK.repositionAllInputs) {
          console.log("[SDK Test] 🔄 Repositioning all inputs after gallery display");
          aiSDK.repositionAllInputs();
        }
        // Also manually reposition each input to ensure visibility
        const promptInput = document.getElementById("image-prompt-input");
        const lessonIdInput = document.getElementById("lesson-id-input");
        const imageIdInput = document.getElementById("image-id-input");
        if (promptInput && requestImageButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(promptInput, requestImageButton, 0, 2, buttonWidth);
            }
            promptInput.style.visibility = "visible";
            promptInput.style.display = "block";
            promptInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning prompt input:", e);
            promptInput.style.visibility = "visible";
            promptInput.style.display = "block";
            promptInput.style.zIndex = "1000";
          }
        }
        if (lessonIdInput && getLessonImagesButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(lessonIdInput, getLessonImagesButton, 0, 2, buttonWidth);
            }
            lessonIdInput.style.visibility = "visible";
            lessonIdInput.style.display = "block";
            lessonIdInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning lesson ID input:", e);
            lessonIdInput.style.visibility = "visible";
            lessonIdInput.style.display = "block";
            lessonIdInput.style.zIndex = "1000";
          }
        }
        if (imageIdInput && getLessonImagesButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(imageIdInput, getLessonImagesButton, 0, 32, buttonWidth);
            }
            imageIdInput.style.visibility = "visible";
            imageIdInput.style.display = "block";
            imageIdInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning image ID input:", e);
            imageIdInput.style.visibility = "visible";
            imageIdInput.style.display = "block";
            imageIdInput.style.zIndex = "1000";
          }
        }
      };
      // Wait for gallery to be displayed, then reposition inputs
      setTimeout(repositionInputsAfterGallery, 200);
      setTimeout(repositionInputsAfterGallery, 500);
      setTimeout(repositionInputsAfterGallery, 1000);
      setTimeout(repositionInputsAfterGallery, 1500);
    });
  });
  
  // Position input fields beside the button (stacked vertically) using SDK utilities
  // Use setTimeout to ensure button is fully rendered before positioning
  console.log("[SDK Test] 🔍 About to position lesson/image ID inputs - lessonIdInput:", !!lessonIdInput, "imageIdInput:", !!imageIdInput, "getLessonImagesButton:", !!getLessonImagesButton, "aiSDK:", !!aiSDK);
  
  const positionLessonInputs = () => {
    if (lessonIdInput && getLessonImagesButton) {
      console.log("[SDK Test] 🎯 Executing positioning for lesson ID input");
      try {
        if (aiSDK && aiSDK.positionInputBesideButton) {
          aiSDK.positionInputBesideButton(lessonIdInput, getLessonImagesButton, 0, 2, buttonWidth);
          lessonIdInput.style.visibility = "visible";
          lessonIdInput.style.display = "block";
          lessonIdInput.style.zIndex = "1000";
          console.log("[SDK Test] ✅ Lesson ID input positioned using SDK");
        } else {
          console.warn("[SDK Test] ⚠️ aiSDK.positionInputBesideButton not available, using direct positioning");
          const canvas = lessonIdInput.ownerDocument.querySelector('canvas');
          if (canvas && getLessonImagesButton.getGlobalPosition) {
            const canvasRect = canvas.getBoundingClientRect();
            const globalPos = getLessonImagesButton.getGlobalPosition();
            const buttonScreenX = canvasRect.left + globalPos.x;
            const buttonScreenY = canvasRect.top + globalPos.y;
            
            let inputX = buttonScreenX + buttonWidth + 10;
            let inputY = buttonScreenY + 2;
            
            lessonIdInput.style.position = "absolute";
            lessonIdInput.style.left = inputX + "px";
            lessonIdInput.style.top = inputY + "px";
            lessonIdInput.style.zIndex = "1000";
            lessonIdInput.style.visibility = "visible";
            console.log("[SDK Test] ✅ Lesson ID input positioned directly at", inputX, inputY);
          } else {
            lessonIdInput.style.visibility = "visible";
          }
        }
      } catch (e) {
        console.error("[SDK Test] ❌ Error positioning lesson ID input:", e);
        lessonIdInput.style.visibility = "visible";
      }
    }
    
    if (imageIdInput && getLessonImagesButton) {
      console.log("[SDK Test] 🎯 Executing positioning for image ID input");
      try {
        if (aiSDK && aiSDK.positionInputBesideButton) {
          aiSDK.positionInputBesideButton(imageIdInput, getLessonImagesButton, 0, 32, buttonWidth); // 32px below lesson ID input
          imageIdInput.style.visibility = "visible";
          imageIdInput.style.display = "block";
          imageIdInput.style.zIndex = "1000";
          console.log("[SDK Test] ✅ Image ID input positioned using SDK");
        } else {
          console.warn("[SDK Test] ⚠️ aiSDK.positionInputBesideButton not available, using direct positioning");
          const canvas = imageIdInput.ownerDocument.querySelector('canvas');
          if (canvas && getLessonImagesButton.getGlobalPosition) {
            const canvasRect = canvas.getBoundingClientRect();
            const globalPos = getLessonImagesButton.getGlobalPosition();
            const buttonScreenX = canvasRect.left + globalPos.x;
            const buttonScreenY = canvasRect.top + globalPos.y;
            
            let inputX = buttonScreenX + buttonWidth + 10;
            let inputY = buttonScreenY + 32; // 30px below lesson ID input
            
            imageIdInput.style.position = "absolute";
            imageIdInput.style.left = inputX + "px";
            imageIdInput.style.top = inputY + "px";
            imageIdInput.style.zIndex = "1000";
            imageIdInput.style.visibility = "visible";
            console.log("[SDK Test] ✅ Image ID input positioned directly at", inputX, inputY);
          } else {
            imageIdInput.style.visibility = "visible";
          }
        }
      } catch (e) {
        console.error("[SDK Test] ❌ Error positioning image ID input:", e);
        imageIdInput.style.visibility = "visible";
      }
    }
  };
  
  // Wait for button to be fully rendered before positioning - use longer delays
  setTimeout(positionLessonInputs, 100);
  setTimeout(positionLessonInputs, 300);
  setTimeout(positionLessonInputs, 500);
  
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
  
  // Function to load and display image in PixiJS canvas
  function loadAndDisplayImage(imageSource) {
    const dataUrl = imageSource.startsWith("data:") ? imageSource : (imageSource.startsWith("http") ? imageSource : "data:image/png;base64," + imageSource);
    PIXI.Assets.load(dataUrl).then((texture) => {
      // Remove old image if exists
      if (displayedImageSprite) {
        app.stage.removeChild(displayedImageSprite);
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
      const imageY = Math.max(yPos + 50, lowestBottom + 40); // 40px spacing after lowest element
      displayedImageSprite.y = imageY;
      app.stage.addChild(displayedImageSprite);
      
      // Resize canvas to fit image FIRST
      const currentHeight = app.screen.height;
      const newHeight = Math.max(currentHeight, displayedImageSprite.y + displayedImageSprite.height + 100);
      app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
      
      // Update status AFTER positioning to ensure it doesn't affect layout
      updateStatus("Image displayed!", 0x00ff00);
      
      // Force a render to ensure canvas resize is complete before repositioning inputs
      app.render();
      
      // Reposition input fields AFTER canvas resize and image is fully displayed
      // Use multiple attempts with increasing delays to ensure everything is rendered
      const repositionAllInputsAfterImage = () => {
        if (aiSDK && aiSDK.repositionAllInputs) {
          console.log("[SDK Test] 🔄 Repositioning all inputs after image display");
          aiSDK.repositionAllInputs();
        }
        // Also manually reposition each input to ensure visibility
        const promptInput = document.getElementById("image-prompt-input");
        const lessonIdInput = document.getElementById("lesson-id-input");
        const imageIdInput = document.getElementById("image-id-input");
        if (promptInput && requestImageButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(promptInput, requestImageButton, 0, 2, buttonWidth);
            }
            promptInput.style.visibility = "visible";
            promptInput.style.display = "block";
            promptInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning prompt input:", e);
            promptInput.style.visibility = "visible";
            promptInput.style.display = "block";
            promptInput.style.zIndex = "1000";
          }
        }
        if (lessonIdInput && getLessonImagesButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(lessonIdInput, getLessonImagesButton, 0, 2, buttonWidth);
            }
            lessonIdInput.style.visibility = "visible";
            lessonIdInput.style.display = "block";
            lessonIdInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning lesson ID input:", e);
            lessonIdInput.style.visibility = "visible";
            lessonIdInput.style.display = "block";
            lessonIdInput.style.zIndex = "1000";
          }
        }
        if (imageIdInput && getLessonImagesButton) {
          try {
            if (aiSDK && aiSDK.positionInputBesideButton) {
              aiSDK.positionInputBesideButton(imageIdInput, getLessonImagesButton, 0, 32, buttonWidth);
            }
            imageIdInput.style.visibility = "visible";
            imageIdInput.style.display = "block";
            imageIdInput.style.zIndex = "1000";
          } catch (e) {
            console.error("[SDK Test] Error repositioning image ID input:", e);
            imageIdInput.style.visibility = "visible";
            imageIdInput.style.display = "block";
            imageIdInput.style.zIndex = "1000";
          }
        }
      };
      // Wait for canvas resize to complete, then reposition inputs
      // Use longer delays to ensure canvas resize and rendering are complete
      setTimeout(repositionAllInputsAfterImage, 200);
      setTimeout(repositionAllInputsAfterImage, 500);
      setTimeout(repositionAllInputsAfterImage, 1000);
      setTimeout(repositionAllInputsAfterImage, 1500);
    }).catch((error) => {
      console.error("[SDK Test] Failed to load image:", error);
      updateStatus("Failed to load image: " + error.message, 0xff0000);
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
    
    // Calculate starting Y position - find the bottom of the image IDs display or last button
    let galleryStartY = 300; // Default start position
    
    // First, check if image IDs display exists and position gallery below it
    if (imageIdsDisplayContainer && imageIdsDisplayContainer.y !== undefined) {
      // Calculate the bottom of the image IDs container
      const imageIdsBottom = imageIdsDisplayContainer.y + imageIdsDisplayContainer.height;
      galleryStartY = imageIdsBottom + 40; // Increased from 30 to 40 - more spacing between image IDs and gallery title to prevent overlap
    } else {
      // Fallback: find the last button's Y position
      const allButtons = app.stage.children.filter(child => child.buttonY !== undefined);
      if (allButtons.length > 0) {
        const lastButton = allButtons.reduce((prev, curr) => (curr.buttonY > prev.buttonY ? curr : prev));
        galleryStartY = lastButton.buttonY + buttonHeight + buttonSpacing + 50;
      }
    }
    
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
          if (imagesLoaded === totalImages && callback) {
            // Force a render to ensure all images are rendered
            app.render();
            // Wait a bit more for rendering to complete
            setTimeout(() => {
              if (callback) callback();
            }, 100);
          }
        }).catch((error) => {
          console.error("[SDK Test] Failed to load recalled image:", error);
          // Still count as loaded to avoid hanging
          imagesLoaded++;
          if (imagesLoaded === totalImages && callback) {
            app.render();
            setTimeout(() => {
              if (callback) callback();
            }, 100);
          }
        });
      }
    });
    
    app.stage.addChild(imageGalleryContainer);
    
    // Resize canvas to fit gallery
    const galleryHeight = currentY + imageSize + 100;
    const currentHeight = app.screen.height;
    const newHeight = Math.max(currentHeight, imageGalleryContainer.y + galleryHeight + 100);
    app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
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
    // Reposition all HTML inputs when canvas resizes (following layering strategy)
    setTimeout(() => {
      aiSDK.repositionAllInputs();
    }, 10);
  });
  
  // Also handle canvas resize events from PixiJS
  app.renderer.on("resize", () => {
    setTimeout(() => {
      aiSDK.repositionAllInputs();
    }, 10);
  });
  
  // Initial positioning after everything is rendered
  setTimeout(() => {
    console.log("[SDK Test] Running initial repositionAllInputs()");
    try {
      aiSDK.repositionAllInputs();
      console.log("[SDK Test] ✅ Initial repositionAllInputs() completed");
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
      console.log('[InteractionTypes] 🔍 About to update - jsCode length:', jsCode.length);
      console.log('[InteractionTypes] 🔍 jsCode includes debug log:', jsCode.includes('🔍 Looking for image-prompt-input'));
      existing.jsCode = jsCode;
      existing.htmlCode = '<div id="pixi-container"></div><input type="text" id="image-prompt-input" placeholder="Image prompt..." style="width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 20px; visibility: hidden;" /><input type="text" id="lesson-id-input" placeholder="Lesson ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 50px; visibility: hidden;" /><input type="text" id="image-id-input" placeholder="Image ID (optional)" style="width: 200px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000; position: absolute; left: 20px; top: 80px; visibility: hidden;" />';
      existing.cssCode = '#pixi-container { width: 100%; height: 100%; } #image-prompt-input, #lesson-id-input, #image-id-input { font-family: inherit; }';
      existing.description = 'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, responses, and image generation.';
      console.log('[InteractionTypes] 🔍 Calling save() with jsCode length:', existing.jsCode.length);
      const saved = await this.interactionTypeRepository.save(existing);
      console.log('[InteractionTypes] 🔍 Save() completed, saved entity jsCode length:', saved.jsCode?.length);
      console.log('[InteractionTypes] ✅ Updated SDK Test PixiJS interaction with image generation code and HTML/CSS');
      console.log('[InteractionTypes] 🔍 Verifying update - checking jsCode contains string concatenation...');
      // Reload to get the updated entity
      const updated = await this.interactionTypeRepository.findOne({ where: { id: 'sdk-test-pixijs' } });
      if (updated && updated.jsCode) {
        const hasTemplateLiteral = updated.jsCode.includes('`req-${Date.now()');
        const hasStringConcat = updated.jsCode.includes("'req-' + Date.now()");
        console.log('[InteractionTypes] 🔍 Database check - hasTemplateLiteral:', hasTemplateLiteral, 'hasStringConcat:', hasStringConcat);
        if (hasTemplateLiteral && !hasStringConcat) {
          console.error('[InteractionTypes] ❌ ERROR: Database still has template literals! Update may have failed.');
        } else if (hasStringConcat) {
          console.log('[InteractionTypes] ✅ Database correctly updated with string concatenation');
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
        cssCode: '#pixi-container { width: 100%; height: 100%; } #image-prompt-input, #lesson-id-input, #image-id-input { font-family: inherit; }',
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
