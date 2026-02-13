// Register a community package in N8N's database so it's properly recognized.
// Run inside the N8N container after npm-installing the package.
// Usage: node register-n8n-community-pkg.js <packageName>

const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const DB_PATH = "/home/node/.n8n/database.sqlite";
const NODES_DIR = "/home/node/.n8n/nodes/node_modules";
const PACKAGE_NAME = process.argv[2];

if (!PACKAGE_NAME) {
  console.error("Usage: node register-n8n-community-pkg.js <packageName>");
  process.exit(1);
}

const pkgDir = path.join(NODES_DIR, PACKAGE_NAME);
if (!fs.existsSync(pkgDir)) {
  console.error(`Package not found at ${pkgDir}`);
  process.exit(1);
}

// Read package.json
const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8"));
const version = pkgJson.version || "0.0.0";
const authorName = typeof pkgJson.author === "string" ? pkgJson.author : (pkgJson.author?.name || "");
const authorEmail = typeof pkgJson.author === "object" ? (pkgJson.author?.email || "") : "";

console.log("Package:", PACKAGE_NAME, "v" + version);
console.log("Author:", authorName, authorEmail);

// Get node definitions from package.json n8n.nodes
const n8nConfig = pkgJson.n8n || {};
const nodeFiles = n8nConfig.nodes || [];
console.log("Node files:", nodeFiles);

// For each node file, read the compiled JS to extract the description.name
const nodeTypes = [];
for (const nodeFile of nodeFiles) {
  const fullPath = path.join(pkgDir, nodeFile);
  if (!fs.existsSync(fullPath)) {
    console.warn("Node file not found:", fullPath);
    continue;
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  // Look for description = { ... name: 'xxx' ...  }
  // The name field is the node type identifier
  const nameMatch = content.match(/description\s*=\s*\{[\s\S]*?name:\s*['"]([^'"]+)['"]/);
  const displayNameMatch = content.match(/displayName:\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    nodeTypes.push({
      name: nameMatch[1],
      displayName: displayNameMatch ? displayNameMatch[1] : nameMatch[1],
      // Full type string used in workflows
      type: PACKAGE_NAME + "." + nameMatch[1],
    });
  }
}
console.log("Node types found:", nodeTypes);

if (nodeTypes.length === 0) {
  console.error("No node types found in the package. Cannot register.");
  process.exit(1);
}

// Open database and register
const db = new DatabaseSync(DB_PATH);

// Check installed_packages schema
const pkgSchema = db.prepare("PRAGMA table_info(installed_packages)").all();
console.log("\ninstalled_packages columns:", pkgSchema.map(c => c.name + " (" + c.type + ")").join(", "));

const nodeSchema = db.prepare("PRAGMA table_info(installed_nodes)").all();
console.log("installed_nodes columns:", nodeSchema.map(c => c.name + " (" + c.type + ")").join(", "));

// Check if already registered
const existing = db.prepare("SELECT * FROM installed_packages WHERE packageName = ?").all(PACKAGE_NAME);
if (existing.length > 0) {
  console.log("\nPackage already registered:", JSON.stringify(existing));
  // Update version if different
  const current = existing[0];
  if (current.installedVersion !== version) {
    db.prepare("UPDATE installed_packages SET installedVersion = ? WHERE packageName = ?").run(version, PACKAGE_NAME);
    console.log("Updated version from", current.installedVersion, "to", version);
  }
} else {
  // Insert into installed_packages
  const pkgCols = pkgSchema.map(c => c.name);
  console.log("\nInserting into installed_packages...");
  
  // Build insert based on available columns
  const values = {};
  if (pkgCols.includes("packageName")) values.packageName = PACKAGE_NAME;
  if (pkgCols.includes("installedVersion")) values.installedVersion = version;
  if (pkgCols.includes("authorName")) values.authorName = authorName;
  if (pkgCols.includes("authorEmail")) values.authorEmail = authorEmail;
  if (pkgCols.includes("createdAt")) values.createdAt = new Date().toISOString();
  if (pkgCols.includes("updatedAt")) values.updatedAt = new Date().toISOString();
  
  const cols = Object.keys(values);
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO installed_packages (${cols.join(", ")}) VALUES (${placeholders})`;
  console.log("SQL:", sql);
  console.log("Values:", Object.values(values));
  db.prepare(sql).run(...Object.values(values));
  console.log("Package registered successfully!");
}

// Register each node type in installed_nodes
for (const nt of nodeTypes) {
  const existingNode = db.prepare("SELECT * FROM installed_nodes WHERE name = ?").all(nt.type);
  if (existingNode.length > 0) {
    console.log("Node already registered:", nt.type);
    continue;
  }
  
  const nodeCols = nodeSchema.map(c => c.name);
  const nodeValues = {};
  if (nodeCols.includes("name")) nodeValues.name = nt.type;
  if (nodeCols.includes("type")) nodeValues.type = nt.type;
  if (nodeCols.includes("package")) nodeValues.package = PACKAGE_NAME;
  if (nodeCols.includes("packageName")) nodeValues.packageName = PACKAGE_NAME;
  if (nodeCols.includes("latestVersion")) nodeValues.latestVersion = version;
  
  const nCols = Object.keys(nodeValues);
  const nPlaceholders = nCols.map(() => "?").join(", ");
  const nSql = `INSERT INTO installed_nodes (${nCols.join(", ")}) VALUES (${nPlaceholders})`;
  console.log("Registering node:", nt.type, "SQL:", nSql);
  db.prepare(nSql).run(...Object.values(nodeValues));
  console.log("Node registered:", nt.type);
}

// Verify
console.log("\n=== VERIFICATION ===");
const pkgs = db.prepare("SELECT * FROM installed_packages").all();
console.log("installed_packages:", JSON.stringify(pkgs, null, 2));
const nodes = db.prepare("SELECT * FROM installed_nodes").all();
console.log("installed_nodes:", JSON.stringify(nodes, null, 2));

db.close();
console.log("\nDone! Restart N8N for changes to take effect.");
