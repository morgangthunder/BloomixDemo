const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'upora_dev',
  user: 'upora_user',
  password: 'upora_password',
});

async function updateWidgetCode() {
  await client.connect();
  console.log('✅ Connected to database');

  try {
    // Get the interaction
    const result = await client.query(
      "SELECT id, js_code, html_code, widgets FROM interaction_types WHERE id = 'true-false-selection'"
    );

    if (result.rows.length === 0) {
      console.error('❌ Interaction not found');
      return;
    }

    const interaction = result.rows[0];
    console.log('📋 Found interaction:', interaction.id);
    console.log('📋 Widgets:', JSON.stringify(interaction.widgets, null, 2));

    // Get widget instances
    const widgets = interaction.widgets || { instances: [] };
    const instances = widgets.instances || [];

    console.log(`📋 Found ${instances.length} widget instance(s)`);

    let updatedJs = interaction.js_code || '';
    let updatedHtml = interaction.html_code || '';

    // Process each enabled widget instance
    for (const instance of instances) {
      if (!instance.enabled) {
        console.log(`⏭️  Skipping disabled widget: ${instance.type} (${instance.id})`);
        continue;
      }

      console.log(`🔧 Processing widget: ${instance.type} (${instance.id})`);

      const widgetId = instance.type;
      const instanceId = instance.id;

      // Generate new widget HTML
      const widgetHtml = `<!-- WIDGET:${widgetId}:START -->\n<div id="widget-${instanceId}"></div>\n<!-- WIDGET:${widgetId}:END -->`;

      // Generate new widget JS with waiting logic
      const configPath = `window.interactionConfig?.widgetConfigs?.['${instanceId}']?.config || {}`;
      
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

      const initCall = widgetId === 'image-carousel' 
        ? `      if (window.aiSDK.initImageCarousel) {
        console.log('[Widget] Calling initImageCarousel with config:', ${configPath});
        window.aiSDK.initImageCarousel(${configPath});
      } else {
        console.warn('[Widget] initImageCarousel method not found on aiSDK');
      }`
        : widgetId === 'timer'
        ? `      if (window.aiSDK.initTimer) {
        console.log('[Widget] Calling initTimer with config:', ${configPath});
        window.aiSDK.initTimer(${configPath});
      } else {
        console.warn('[Widget] initTimer method not found on aiSDK');
      }`
        : `      if (window.aiSDK.initWidget) {
        console.log('[Widget] Calling initWidget with config:', ${configPath});
        window.aiSDK.initWidget('${widgetId}', ${configPath});
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

      const widgetJs = `// WIDGET:${widgetId}:START
${waitForSDK}${initCall}
${waitForSDKEnd}
// WIDGET:${widgetId}:END`;

      // Remove old widget code
      const htmlMarkerStart = `<!-- WIDGET:${widgetId}:START -->`;
      const htmlMarkerEnd = `<!-- WIDGET:${widgetId}:END -->`;
      const htmlRegex = new RegExp(
        htmlMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + htmlMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
      );
      updatedHtml = updatedHtml.replace(htmlRegex, '').trim();

      const jsMarkerStart = `// WIDGET:${widgetId}:START`;
      const jsMarkerEnd = `// WIDGET:${widgetId}:END`;
      const jsRegex = new RegExp(
        jsMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + jsMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
      );
      updatedJs = updatedJs.replace(jsRegex, '').trim();

      // Add new widget code
      updatedHtml = updatedHtml + '\n' + widgetHtml;
      updatedJs = updatedJs + '\n' + widgetJs;

      console.log(`✅ Updated widget code for ${widgetId} (${instanceId})`);
    }

    // Update database
    await client.query(
      'UPDATE interaction_types SET html_code = $1, js_code = $2 WHERE id = $3',
      [updatedHtml, updatedJs, 'true-false-selection']
    );

    console.log('✅ Widget code updated in database');
    console.log(`📏 New HTML length: ${updatedHtml.length}`);
    console.log(`📏 New JS length: ${updatedJs.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

updateWidgetCode();
