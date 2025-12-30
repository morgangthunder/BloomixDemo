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
    emitEvent: (event, processedContentId) => sendMessage("ai-sdk-emit-event", { event, processedContentId }),
    updateState: (key, value) => sendMessage("ai-sdk-update-state", { key, value }),
    getState: (callback) => sendMessage("ai-sdk-get-state", {}, (response) => callback(response.state)),
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
    generateImage: (options, callback) => sendMessage("ai-sdk-generate-image", { options }, (response) => { if (callback) callback(response); }),
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
    yPos += buttonHeight + buttonSpacing;
    return container;
  }
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
  yPos += 20;
  const imageLabel = new PIXI.Text("IMAGE GENERATION", { fontSize: 18, fill: 0x00d4ff, fontWeight: "bold" });
  imageLabel.x = 20;
  imageLabel.y = yPos;
  app.stage.addChild(imageLabel);
  yPos += 30;
  
  // Get the HTML input field (added in HTML code section)
  const promptInput = document.getElementById("image-prompt-input");
  if (!promptInput) {
    console.warn("[SDK Test] Image prompt input field not found. Make sure HTML code includes input element with id image-prompt-input");
  }
  
  let imagePromptText = "";
  let generatedImageUrl = null;
  let generatedImageData = null;
  let imageReady = false;
  let displayedImageSprite = null;
  
  // Update prompt text when input changes (if input field exists)
  // Note: We don't log on every keystroke to avoid console spam
  if (promptInput) {
    promptInput.addEventListener("input", (e) => {
      imagePromptText = (e.target && e.target.value) ? e.target.value : "";
      // Don't log on every keystroke - only update internal state
    });
  }
  
  createButton("Request Image", () => {
    imagePromptText = promptInput ? promptInput.value.trim() : "";
    if (!imagePromptText) {
      updateStatus("Please enter an image prompt first", 0xff0000);
      return;
    }
    updateStatus("Generating image...", 0xffff00);
    imageReady = false;
    generatedImageUrl = null;
    generatedImageData = null;
    if (displayedImageSprite) {
      app.stage.removeChild(displayedImageSprite);
      displayedImageSprite = null;
    }
    aiSDK.generateImage({ prompt: imagePromptText, userInput: "Test input from SDK" }, (response) => {
      if (response.success) {
        if (response.imageUrl) {
          generatedImageUrl = response.imageUrl;
          imageReady = true;
          updateStatus("Image ready! Loading...", 0x00ff00);
          loadAndDisplayImage(response.imageUrl);
        } else if (response.imageData) {
          generatedImageData = response.imageData;
          imageReady = true;
          updateStatus("Image ready! Loading...", 0x00ff00);
          loadAndDisplayImage(response.imageData);
        } else {
          updateStatus("Image generated but no URL/data returned", 0xffff00);
        }
        aiSDK.emitEvent({ type: "image-generated", data: { imageUrl: response.imageUrl, imageData: response.imageData, requestId: response.requestId }, requiresLLMResponse: false });
      } else {
        updateStatus("Error: " + (response.error || "Unknown error"), 0xff0000);
        imageReady = false;
      }
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
      displayedImageSprite.y = yPos + 50; // Below the input and button
      app.stage.addChild(displayedImageSprite);
      updateStatus("Image displayed!", 0x00ff00);
      // Resize canvas to fit image
      const currentHeight = app.screen.height;
      const newHeight = Math.max(currentHeight, displayedImageSprite.y + displayedImageSprite.height + 100);
      app.renderer.resize(Math.max(window.innerWidth, 800), newHeight);
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
  statusYPos = yPos + 20;
  statusTextInitialized = true;
  updateStatus("SDK Test Interaction Loaded. Waiting for SDK ready...", 0xffff00);
  const contentHeight = statusYPos + 100;
  const minHeight = Math.max(window.innerHeight, 600);
  const finalHeight = Math.max(contentHeight, minHeight);
  app.renderer.resize(Math.max(window.innerWidth, 800), finalHeight);
  window.addEventListener("resize", () => {
    const newWidth = Math.max(window.innerWidth, 800);
    const contentBasedHeight = Math.max(statusYPos + 100, Math.max(window.innerHeight, 600));
    app.renderer.resize(newWidth, contentBasedHeight);
    if (statusText) statusText.style.wordWrapWidth = newWidth - 40;
  });
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
      existing.jsCode = jsCode;
      existing.htmlCode = '<div id="pixi-container"></div><input type="text" id="image-prompt-input" placeholder="Enter image generation prompt..." style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" />';
      existing.cssCode = '#pixi-container { width: 100%; height: 100%; } #image-prompt-input { font-family: inherit; }';
      existing.description = 'Comprehensive test interaction for all AI Teacher SDK functionality including data storage, UI controls, events, responses, and image generation.';
      const saved = await this.interactionTypeRepository.save(existing);
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
        htmlCode: '<div id="pixi-container"></div><input type="text" id="image-prompt-input" placeholder="Enter image generation prompt..." style="position: absolute; left: 20px; top: 20px; width: 280px; padding: 8px; border: 2px solid #00d4ff; border-radius: 4px; background: rgba(15, 15, 35, 0.9); color: #ffffff; font-size: 12px; z-index: 1000;" />',
        cssCode: '#pixi-container { width: 100%; height: 100%; } #image-prompt-input { font-family: inherit; }',
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
