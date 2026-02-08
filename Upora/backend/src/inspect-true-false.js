const { Client } = require('pg');

async function inspect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bloomix'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT id, name, interaction_type_category, widgets, js_code FROM interaction_types WHERE id = 'true-false-selection'");
    if (res.rows.length === 0) {
      console.log('Interaction type true-false-selection not found');
      return;
    }
    const interaction = res.rows[0];
    console.log('ID:', interaction.id);
    console.log('Name:', interaction.name);
    console.log('Category:', interaction.interaction_type_category);
    console.log('Widgets:', JSON.stringify(interaction.widgets, null, 2));
    console.log('JS Code Length:', interaction.js_code ? interaction.js_code.length : 0);
    if (interaction.js_code) {
      console.log('JS Code includes WIDGET:', interaction.js_code.includes('WIDGET:'));
      if (interaction.js_code.includes('WIDGET:')) {
          console.log('JS Code around WIDGET:', interaction.js_code.substring(interaction.js_code.indexOf('WIDGET:'), interaction.js_code.indexOf('WIDGET:') + 200));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

inspect();
