/**
 * Shared Interaction SDK Builder
 *
 * Generates the JavaScript source for the interaction SDK as a string.
 * Used by all 5 interaction categories (HTML, PixiJS, iFrame, MediaPlayer, VideoURL)
 * to ensure method parity across the board.
 *
 * Two transport modes:
 * - 'postMessage': for iframe-based interactions (HTML, PixiJS, iFrame)
 * - 'customEvent': for same-document interactions (MediaPlayer overlay, VideoURL section)
 */

export type SDKTransport = 'postMessage' | 'customEvent';

export interface SDKBuildOptions {
  transport: SDKTransport;
  /** Expose as window.createIframeAISDK (iframe) or window.aiSDK (same-doc). Default: auto based on transport. */
  exposeAs?: 'createIframeAISDK' | 'aiSDK';
  /** Include score sanitization in saveUserProgress (adds ~20 lines). Default true for iframe, false for customEvent. */
  sanitizeScore?: boolean;
}

/**
 * Build the full SDK JavaScript source as a plain string.
 * Does NOT include <script> tags — caller wraps as needed.
 */
export function buildInteractionSDKScript(options: SDKBuildOptions): string {
  const { transport } = options;
  const exposeAs = options.exposeAs ?? (transport === 'postMessage' ? 'createIframeAISDK' : 'aiSDK');
  const sanitize = options.sanitizeScore ?? (transport === 'postMessage');

  const sendMessageFn = transport === 'postMessage'
    ? SEND_MESSAGE_POST_MESSAGE
    : SEND_MESSAGE_CUSTOM_EVENT;

  const isReadyFn = transport === 'postMessage'
    ? IS_READY_POST_MESSAGE
    : IS_READY_CUSTOM_EVENT;

  const methods = buildMethodsBlock(sanitize);

  if (exposeAs === 'createIframeAISDK') {
    return `
(function() {
  if (typeof window.createIframeAISDK !== 'undefined') return;
  window.createIframeAISDK = function() {
    var subscriptionId = null;
    var requestCounter = 0;
    var generateRequestId = function() { return "req-" + Date.now() + "-" + (++requestCounter); };
    var generateSubscriptionId = function() { return "sub-" + Date.now() + "-" + Math.random(); };
${sendMessageFn}
${isReadyFn}
    return {
${methods}
    };
  };
})();
`.trim();
  }

  // exposeAs === 'aiSDK'
  return `
(function() {
  if (window.aiSDK) return;
  var subscriptionId = null;
  var requestCounter = 0;
  var generateRequestId = function() { return "req-" + Date.now() + "-" + (++requestCounter); };
  var generateSubscriptionId = function() { return "sub-" + Date.now() + "-" + Math.random(); };
${sendMessageFn}
${isReadyFn}
  window.aiSDK = {
${methods}
  };
})();
`.trim();
}

// ---------------------------------------------------------------------------
// Transport implementations
// ---------------------------------------------------------------------------

const SEND_MESSAGE_POST_MESSAGE = `
    var sendMessage = function(type, data, callback) {
      var requestId = generateRequestId();
      var message = Object.assign({ type: type, requestId: requestId }, data);
      if (callback) {
        var listener = function(event) {
          if (event.data && event.data.requestId === requestId) {
            window.removeEventListener("message", listener);
            callback(event.data);
          }
        };
        window.addEventListener("message", listener);
      }
      window.parent.postMessage(message, "*");
    };`;

const SEND_MESSAGE_CUSTOM_EVENT = `
    var sendMessage = function(type, data, callback) {
      var message = Object.assign({ type: type }, data);
      document.dispatchEvent(new CustomEvent("ai-sdk-message", { detail: message }));
      if (callback) { setTimeout(function() { callback({ success: true }); }, 0); }
    };`;

const IS_READY_POST_MESSAGE = `
    var _isReady = function(callback) {
      var listener = function(event) {
        if (event.data && event.data.type === "ai-sdk-ready") {
          window.removeEventListener("message", listener);
          if (callback) callback(true);
        }
      };
      window.addEventListener("message", listener);
    };`;

const IS_READY_CUSTOM_EVENT = `
    var _isReady = function(callback) {
      if (callback) setTimeout(function() { callback(true); }, 0);
    };`;

// ---------------------------------------------------------------------------
// Method block builder
// ---------------------------------------------------------------------------

function buildMethodsBlock(sanitizeScore: boolean): string {
  const saveUserProgressBody = sanitizeScore
    ? `function(data, callback) {
        var sanitized = {};
        if (data.score !== undefined && data.score !== null) {
          var n = Number(data.score);
          if (!isNaN(n) && isFinite(n)) { sanitized.score = Math.round(n * 100) / 100; }
        }
        if (data.timeTakenSeconds !== undefined) sanitized.timeTakenSeconds = data.timeTakenSeconds;
        if (data.interactionEvents !== undefined) sanitized.interactionEvents = data.interactionEvents;
        if (data.customData !== undefined) sanitized.customData = data.customData;
        if (data.completed !== undefined) sanitized.completed = data.completed;
        sendMessage("ai-sdk-save-user-progress", { data: sanitized }, function(r) { if (callback) callback(r.progress, r.error); });
      }`
    : `function(data, callback) {
        sendMessage("ai-sdk-save-user-progress", { data: data }, function(r) { if (callback) callback(r.progress, r.error); });
      }`;

  return `
      // ── Lifecycle ──
      isReady: _isReady,
      completeInteraction: function() { sendMessage("ai-sdk-complete-interaction", {}); },

      // ── Events & State ──
      emitEvent: function(event, processedContentId) { sendMessage("ai-sdk-emit-event", { event: event, processedContentId: processedContentId }); },
      updateState: function(key, value) { sendMessage("ai-sdk-update-state", { key: key, value: value }); },
      getState: function(callback) { sendMessage("ai-sdk-get-state", {}, function(r) { if (callback) callback(r.state); }); },
      onResponse: function(callback) {
        subscriptionId = generateSubscriptionId();
        sendMessage("ai-sdk-subscribe", { subscriptionId: subscriptionId }, function() {
          var listener = function(event) {
            if (event.data && event.data.type === "ai-sdk-response" && event.data.subscriptionId === subscriptionId) { callback(event.data.response); }
          };
          window.addEventListener("message", listener);
        });
      },

      // ── UI Controls ──
      minimizeChatUI: function() { sendMessage("ai-sdk-minimize-chat-ui", {}); },
      showChatUI: function() { sendMessage("ai-sdk-show-chat-ui", {}); },
      activateFullscreen: function() { sendMessage("ai-sdk-activate-fullscreen", {}); },
      deactivateFullscreen: function() { sendMessage("ai-sdk-deactivate-fullscreen", {}); },
      postToChat: function(content, role, openChat) { sendMessage("ai-sdk-post-to-chat", { content: content, role: role || "assistant", showInWidget: openChat || false }); },
      showScript: function(script, autoPlay) { sendMessage("ai-sdk-show-script", { script: script, autoPlay: autoPlay || false }); },
      showSnack: function(content, duration, hideFromChatUI, actions, callback) {
        sendMessage("ai-sdk-show-snack", { content: content, duration: duration, hideFromChatUI: hideFromChatUI || false, actions: actions || [] }, function(r) { if (callback && r.snackId) callback(r.snackId); });
      },
      hideSnack: function() { sendMessage("ai-sdk-hide-snack", {}); },
      setInteractionInfo: function(content) { sendMessage("ai-sdk-set-interaction-info", { content: content }); },

      // ── Audio ──
      playSfx: function(name) { sendMessage("ai-sdk-play-sfx", { name: name }); },
      startBgMusic: function(style) { sendMessage("ai-sdk-start-bg-music", { style: style || "calm" }); },
      startBgMusicFromUrl: function(url, loopConfig) { sendMessage("ai-sdk-start-bg-music-url", { url: url, loopConfig: loopConfig }); },
      stopBgMusic: function() { sendMessage("ai-sdk-stop-bg-music", {}); },
      setAudioVolume: function(channel, level) { sendMessage("ai-sdk-set-audio-volume", { channel: channel, level: level }); },

      // ── Data Storage ──
      saveInstanceData: function(data, callback) { sendMessage("ai-sdk-save-instance-data", { data: data }, function(r) { if (callback) callback(r.success, r.error); }); },
      getInstanceDataHistory: function(filters, callback) { sendMessage("ai-sdk-get-instance-data-history", { filters: filters || {} }, function(r) { if (callback) callback(r.data, r.error); }); },

      // ── User Progress ──
      saveUserProgress: ${saveUserProgressBody},
      getUserProgress: function(callback) { sendMessage("ai-sdk-get-user-progress", {}, function(r) { if (callback) callback(r.progress, r.error); }); },
      markCompleted: function(callback) { sendMessage("ai-sdk-mark-completed", {}, function(r) { if (callback) callback(r.progress, r.error); }); },
      incrementAttempts: function(callback) { sendMessage("ai-sdk-increment-attempts", {}, function(r) { if (callback) callback(r.progress, r.error); }); },
      getUserPublicProfile: function(userId, callback) { sendMessage("ai-sdk-get-user-public-profile", { userId: userId }, function(r) { if (callback) callback(r.profile, r.error); }); },

      // ── Image Generation ──
      generateImage: function(options, callback) { sendMessage("ai-sdk-generate-image", { options: options }, function(r) { if (callback) callback(r); }); },
      getLessonImages: function(callback) { sendMessage("ai-sdk-get-lesson-images", {}, function(r) { if (callback) callback(r.images || [], r.error); }); },
      getLessonImageIds: function(callback) { sendMessage("ai-sdk-get-lesson-image-ids", {}, function(r) { if (callback) callback(r.imageIds || [], r.error); }); },
      findImagePair: function(options, callback) { sendMessage("ai-sdk-find-image-pair", { options: options }, function(r) { if (callback) callback(r); }); },
      selectBestTheme: function(options, callback) { sendMessage("ai-sdk-select-theme", { options: options }, function(r) { if (callback) callback(r); }); },
      deleteImage: function(imageId, callback) { sendMessage("ai-sdk-delete-image", { imageId: imageId }, function(r) { if (callback) callback(r); }); },

      // ── Media Controls ──
      playMedia: function(callback) { sendMessage("ai-sdk-play-media", {}, function(r) { if (callback) callback(r.success, r.error); }); },
      pauseMedia: function() { sendMessage("ai-sdk-pause-media", {}); },
      seekMedia: function(time) { sendMessage("ai-sdk-seek-media", { time: time }); },
      setMediaVolume: function(volume) { sendMessage("ai-sdk-set-media-volume", { volume: volume }); },
      getMediaCurrentTime: function(callback) { sendMessage("ai-sdk-get-media-current-time", {}, function(r) { if (callback) callback(r.currentTime); }); },
      getMediaDuration: function(callback) { sendMessage("ai-sdk-get-media-duration", {}, function(r) { if (callback) callback(r.duration); }); },
      isMediaPlaying: function(callback) { sendMessage("ai-sdk-is-media-playing", {}, function(r) { if (callback) callback(r.isPlaying); }); },
      showOverlayHtml: function() { sendMessage("ai-sdk-show-overlay-html", {}); },
      hideOverlayHtml: function() { sendMessage("ai-sdk-hide-overlay-html", {}); },

      // ── Cross-Interaction Navigation ──
      navigateToSubstage: function(stageId, substageId) { sendMessage("ai-sdk-navigate-to-substage", { stageId: stageId, substageId: substageId }); },
      getLessonStructure: function(callback) { sendMessage("ai-sdk-get-lesson-structure", {}, function(r) { if (callback) callback(r.structure); }); },

      // ── Shared Lesson Data ──
      setSharedData: function(key, value, callback) { sendMessage("ai-sdk-set-shared-data", { key: key, value: value }, function() { if (callback) callback(); }); },
      getSharedData: function(key, callback) { sendMessage("ai-sdk-get-shared-data", { key: key }, function(r) { if (callback) callback(r); }); },
      getAllSharedData: function(callback) { sendMessage("ai-sdk-get-all-shared-data", {}, function(r) { if (callback) callback(r); }); },

      // ── Prefetch ──
      getPrefetchResult: function(key, callback) { sendMessage("ai-sdk-get-prefetch-result", { key: key }, function(r) { if (callback) callback({ result: r.result, status: r.status, error: r.error }); }); },

      // ── Cross-Lesson Navigation & Data ──
      navigateToLesson: function(lessonId, options) { sendMessage("ai-sdk-navigate-to-lesson", { lessonId: lessonId, options: options || {} }); },
      setCrossLessonData: function(targetLessonId, data, callback) { sendMessage("ai-sdk-set-cross-lesson-data", { targetLessonId: targetLessonId, data: data }, function() { if (callback) callback(); }); },

      // ── Internal (for category extensions) ──
      _sendMessage: sendMessage
`;
}
