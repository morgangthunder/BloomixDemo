// Script to install community package via N8N's internal REST API
// This registers the package properly so N8N recognizes its node types.

const http = require("http");

const N8N_URL = "http://localhost:5678";
const PACKAGE_NAME = process.argv[2] || "n8n-nodes-sendmail";

async function fetchJson(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, N8N_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { "Accept": "application/json", ...headers },
    };
    if (body) opts.headers["Content-Type"] = "application/json";
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const cookies = res.headers["set-cookie"] || [];
        resolve({ status: res.statusCode, data, cookies });
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("=== N8N Community Package Installer ===");
  console.log("Package:", PACKAGE_NAME);

  // Step 1: Login with correct field name (N8N v2 uses emailOrLdapLoginId)
  console.log("\n--- Logging in ---");
  let loginBody = { emailOrLdapLoginId: "admin@example.com", password: "admin123" };
  let login = await fetchJson("POST", "/rest/login", loginBody);
  console.log("Login (admin@example.com):", login.status, login.data.substring(0, 300));

  if (login.status !== 200) {
    // Try with 'admin' as the identifier
    loginBody = { emailOrLdapLoginId: "admin", password: "admin123" };
    login = await fetchJson("POST", "/rest/login", loginBody);
    console.log("Login (admin):", login.status, login.data.substring(0, 300));
  }

  if (login.status !== 200) {
    // Try owner setup (first-time setup)
    console.log("\n--- Trying owner setup ---");
    let setup = await fetchJson("GET", "/rest/settings");
    console.log("Settings:", setup.status, setup.data.substring(0, 500));

    // Try different credential combinations
    for (const creds of [
      { emailOrLdapLoginId: "admin", password: "admin123" },
      { email: "admin", password: "admin123" },
      { email: "admin@localhost", password: "admin123" },
    ]) {
      login = await fetchJson("POST", "/rest/login", creds);
      console.log("Login attempt:", JSON.stringify(creds), "->", login.status);
      if (login.status === 200) break;
    }
  }

  if (login.status === 200 && login.cookies.length > 0) {
    const cookieStr = login.cookies.map(c => c.split(";")[0]).join("; ");
    console.log("\n--- Session obtained! ---");

    // List current community packages
    let list = await fetchJson("GET", "/rest/community-packages", null, { Cookie: cookieStr });
    console.log("Current packages:", list.status, list.data.substring(0, 500));

    // Install the package
    console.log("\n--- Installing", PACKAGE_NAME, "---");
    let install = await fetchJson("POST", "/rest/community-packages", { name: PACKAGE_NAME }, { Cookie: cookieStr });
    console.log("Install result:", install.status, install.data.substring(0, 1000));
  } else {
    console.log("\n!!! Could not authenticate. Checking N8N settings...");
    let settings = await fetchJson("GET", "/rest/settings");
    console.log("Public settings:", settings.status, settings.data.substring(0, 500));
  }
}

main().catch(console.error);
