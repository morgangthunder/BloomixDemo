-- Add Show Overlay HTML and Hide Overlay HTML buttons to the SDK test media player interaction
-- This updates the JavaScript code to include these new buttons

UPDATE interaction_types
SET js_code = REPLACE(
  js_code,
  '          createButton("Is Playing?", () => {
            const isPlaying = aiSDK.isMediaPlaying();
            addResult("Is playing: " + isPlaying, "info");
          });',
  '          createButton("Is Playing?", () => {
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
          });'
)
WHERE id = 'sdk-test-media-player'
  AND js_code LIKE '%Is Playing?%'
  AND js_code NOT LIKE '%Show Overlay HTML%';


