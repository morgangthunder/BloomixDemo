import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSDKTestMediaPlayerInteraction1734600001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Media Player SDK Test Interaction
    // This interaction tests all SDK functionality including media control methods
    // The overlay HTML/CSS/JS is injected into the media player component
    
    const overlayHtml = `
      <div id="sdk-test-media-overlay">
        <div id="sdk-test-header">
          <h2>AI Teacher SDK Test - Media Player</h2>
          <p id="status-text">Initializing...</p>
        </div>
        <div id="sdk-test-buttons"></div>
        <div id="sdk-test-results"></div>
      </div>
    `;

    const overlayCss = `
      #sdk-test-media-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(15, 15, 35, 0.95);
        border-top: 2px solid rgba(0, 212, 255, 0.5);
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
        z-index: 1000;
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

    const overlayJs = `
      (function() {
        console.log("[SDK Test Media Player] Starting initialization...");
        
        // Include createIframeAISDK function with media control methods
        const createIframeAISDK = () => {
          let subscriptionId = null;
          let requestCounter = 0;

          const generateRequestId = () => \`req-\${Date.now()}-\${++requestCounter}\`;
          const generateSubscriptionId = () => \`sub-\${Date.now()}-\${Math.random()}\`;

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
            // Media Control Methods
            playMedia: (callback) => {
              sendMessage("ai-sdk-play-media", {}, (response) => {
                if (callback) {
                  callback(response.success, response.error);
                }
              });
            },
            pauseMedia: () => {
              sendMessage("ai-sdk-pause-media", {});
            },
            seekMedia: (time) => {
              sendMessage("ai-sdk-seek-media", { time });
            },
            setMediaVolume: (volume) => {
              sendMessage("ai-sdk-set-media-volume", { volume });
            },
            getMediaCurrentTime: (callback) => {
              sendMessage("ai-sdk-get-media-current-time", {}, (response) => {
                if (callback) {
                  callback(response.currentTime);
                }
              });
            },
            getMediaDuration: (callback) => {
              sendMessage("ai-sdk-get-media-duration", {}, (response) => {
                if (callback) {
                  callback(response.duration);
                }
              });
            },
            isMediaPlaying: (callback) => {
              sendMessage("ai-sdk-is-media-playing", {}, (response) => {
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
          console.log("[SDK Test Media Player]", message);
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
          console.log("[SDK Test Media Player] Initializing app...");
          
          buttonsContainer = document.getElementById("sdk-test-buttons");
          statusText = document.getElementById("status-text");
          resultsContainer = document.getElementById("sdk-test-results");
          
          if (!buttonsContainer || !statusText) {
            console.error("[SDK Test Media Player] Required elements not found!");
            return;
          }

          aiSDK = createIframeAISDK();
          
          const isPreviewMode = !window.parent || window.parent === window;
          
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
            const testMessage = "Test message from Media Player SDK Test!";
            aiSDK.postToChat(testMessage, "assistant", true);
            addResult("Posted to chat", "success");
          });

          createButton("Show Script", () => {
            const testScript = "This is a test script block from the Media Player SDK Test.";
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

          // Media Control Methods
          createSectionLabel("MEDIA CONTROL METHODS");
          createButton("Play Media", () => {
            aiSDK.playMedia((success, error) => {
              if (success) {
                addResult("Media play requested", "success");
              } else {
                addResult("Error: " + error, "error");
              }
            });
          });

          createButton("Pause Media", () => {
            aiSDK.pauseMedia();
            addResult("Media pause requested", "success");
          });

          createButton("Seek to 30s", () => {
            aiSDK.seekMedia(30);
            addResult("Seek to 30 seconds", "success");
          });

          createButton("Seek to 60s", () => {
            aiSDK.seekMedia(60);
            addResult("Seek to 60 seconds", "success");
          });

          createButton("Set Volume 50%", () => {
            aiSDK.setMediaVolume(0.5);
            addResult("Volume set to 50%", "success");
          });

          createButton("Set Volume 100%", () => {
            aiSDK.setMediaVolume(1.0);
            addResult("Volume set to 100%", "success");
          });

          createButton("Get Current Time", () => {
            aiSDK.getMediaCurrentTime((time) => {
              addResult("Current time: " + time.toFixed(2) + "s", "info");
            });
          });

          createButton("Get Duration", () => {
            aiSDK.getMediaDuration((duration) => {
              addResult("Duration: " + duration.toFixed(2) + "s", "info");
            });
          });

          createButton("Is Playing?", () => {
            aiSDK.isMediaPlaying((isPlaying) => {
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

          console.log("[SDK Test Media Player] All buttons created");
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initTestApp);
        } else {
          setTimeout(initTestApp, 10);
        }
      })();
    `;

    await queryRunner.query(`
      INSERT INTO interaction_types (
        id, name, description, category, schema, generation_prompt,
        interaction_type_category, html_code, css_code, js_code,
        config_schema, sample_data,
        instance_data_schema, user_progress_schema, is_active
      ) VALUES (
        'sdk-test-media-player',
        'SDK Test - Media Player',
        'Comprehensive test interaction for all AI Teacher SDK functionality including media control methods. This interaction uses an overlay at the bottom of the media player to display test buttons.',
        'absorb-show',
        '{}',
        'This is a test interaction for SDK functionality with media control methods.',
        'uploaded-media',
        $1,
        $2,
        $3,
        '{"fields": [{"key": "goFullscreenOnLoad", "type": "boolean", "label": "Go to fullscreen on load", "default": false, "description": "Automatically activate fullscreen mode when the interaction loads"}]}',
        '{"message": "This is a test interaction. Select a media file (video or audio) in the interaction configuration."}',
        '{"fields": [{"name": "testValue", "type": "number", "required": false, "description": "Test numeric value"}, {"name": "timestamp", "type": "number", "required": false, "description": "Timestamp of test"}, {"name": "testArray", "type": "array", "required": false, "description": "Test array"}]}',
        '{"customFields": [{"name": "testField", "type": "string", "required": false, "description": "Test string field"}, {"name": "testNumber", "type": "number", "required": false, "description": "Test number field"}]}',
        true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        html_code = EXCLUDED.html_code,
        css_code = EXCLUDED.css_code,
        js_code = EXCLUDED.js_code,
        instance_data_schema = EXCLUDED.instance_data_schema,
        user_progress_schema = EXCLUDED.user_progress_schema;
    `, [overlayHtml, overlayCss, overlayJs]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM interaction_types WHERE id = 'sdk-test-media-player'`);
  }
}

