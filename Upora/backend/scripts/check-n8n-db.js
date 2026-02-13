// Check N8N database tables and community packages
// Uses N8N's own better-sqlite3 module

const path = require("path");

// Find better-sqlite3 from n8n's own installation
const possiblePaths = [
  "/usr/local/lib/node_modules/n8n/node_modules/better-sqlite3",
  "/usr/local/lib/node_modules/n8n/node_modules/@n8n/typeorm/node_modules/better-sqlite3",
  "/usr/local/lib/node_modules/better-sqlite3",
];

let Database;
for (const p of possiblePaths) {
  try {
    Database = require(p);
    console.log("Found better-sqlite3 at:", p);
    break;
  } catch (e) {
    // skip
  }
}

if (!Database) {
  // Try to find it dynamically
  const { execSync } = require("child_process");
  try {
    const found = execSync("find /usr/local/lib -name 'better-sqlite3' -type d 2>/dev/null | head -5").toString().trim();
    console.log("Found paths:", found);
    if (found) {
      Database = require(found.split("\n")[0]);
    }
  } catch (e) {
    console.log("Could not find better-sqlite3");
  }
}

if (!Database) {
  // Alternative: Use N8N's typeorm connection
  console.log("Trying native Node.js SQLite...");
  // Node 22 has experimental node:sqlite
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync("/home/node/.n8n/database.sqlite", { readOnly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log("=== TABLES ===");
    console.log(tables.map(t => t.name).join("\n"));

    // Check relevant tables
    for (const tbl of ["installed_packages", "installed_nodes", "community_packages"]) {
      if (tables.some(t => t.name === tbl)) {
        console.log("\n=== " + tbl.toUpperCase() + " ===");
        const rows = db.prepare("SELECT * FROM " + tbl).all();
        console.log(JSON.stringify(rows, null, 2));
      }
    }

    // Also check for tables containing "package" or "node" or "community"
    const interestingTables = tables.filter(t =>
      t.name.includes("package") || t.name.includes("community") ||
      (t.name.includes("node") && !t.name.includes("_node_"))
    );
    for (const t of interestingTables) {
      if (!["installed_packages", "installed_nodes", "community_packages"].includes(t.name)) {
        console.log("\n=== " + t.name.toUpperCase() + " ===");
        const rows = db.prepare("SELECT * FROM " + t.name + " LIMIT 5").all();
        console.log(JSON.stringify(rows, null, 2));
      }
    }

    db.close();
  } catch (e) {
    console.log("Node.js native SQLite failed:", e.message);
    console.log("Last resort: using hex dump to find table names...");
    const { execSync } = require("child_process");
    const out = execSync("strings /home/node/.n8n/database.sqlite | grep -i 'CREATE TABLE' | head -20").toString();
    console.log(out);
  }
  process.exit(0);
}

const db = new Database("/home/node/.n8n/database.sqlite", { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log("=== TABLES ===");
console.log(tables.map(t => t.name).join("\n"));

for (const tbl of ["installed_packages", "installed_nodes", "community_packages"]) {
  if (tables.some(t => t.name === tbl)) {
    console.log("\n=== " + tbl.toUpperCase() + " ===");
    const rows = db.prepare("SELECT * FROM " + tbl).all();
    console.log(JSON.stringify(rows, null, 2));
  }
}

db.close();
