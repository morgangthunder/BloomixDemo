# Email credentials for message delivery

When users check **“Also send by email”** in the Messages modal, the app can send email in two ways:

1. **SMTP** (recommended) – The backend sends email directly using SMTP credentials you configure in **Super Admin → Messages & Email**. Use SMTP2GO (free tier) now and switch to Google Workspace SMTP later if you like.
2. **N8N webhook** – The backend POSTs to an N8N webhook URL and your N8N workflow sends the email (e.g. via an Email node).

---

## How to access N8N

**Important:** For local development, use the **Docker-hosted N8N** (recommended). The backend is configured to call `http://n8n:5678` from inside Docker. If you use n8n Cloud or another instance, you'll need to update `N8N_API_BASE_URL` in the backend environment.

### Docker N8N (recommended for local dev)

The repo includes an n8n service in `docker-compose.yml`:

- **URL:** **http://localhost:5678** (from your browser) or **http://n8n:5678** (from backend container)
- **Basic Auth:** Enabled with `admin` / `admin123` (see `docker-compose.yml`). You'll still create an owner account (email/password) on first login – this is normal and doesn't disable basic auth.
- **Access:** Open **http://localhost:5678** in your browser. You'll see a login/signup page – create an owner account with your email. After that, basic auth (`admin` / `admin123`) still works for API access, but the UI uses your owner account.

**To ensure Docker n8n is running:**

```bash
docker compose ps n8n
# Should show STATUS: Up (healthy)

# If not running:
docker compose up -d n8n
```

### n8n Cloud (not recommended for local dev)

If you use n8n Cloud, update the backend environment:

- Set **N8N_API_BASE_URL** to your cloud API base (e.g. `https://yourname.app.n8n.cloud`)
- Set **N8N_UI_URL** to your cloud UI URL
- Restart the backend: `docker compose restart backend`

---

## N8N API key (list and manage workflows in the app)

To have the app **list workflows**, **activate/deactivate** them, and **set the message email webhook** from the Super Admin N8N Workflows page, you need an N8N API key.

**Important:** Use the API key from the **same N8N instance** the backend calls:
- If using Docker n8n: Create the API key in **http://localhost:5678** (your Docker instance)
- If using n8n Cloud: Create the API key in your Cloud instance

**Steps:**

1. Open N8N (Docker: **http://localhost:5678** or your Cloud URL).
2. Log in with your owner account (email/password).
3. Go to **Settings** (gear icon) → **API**.
4. Click **Create an API key** (e.g. name it "Upora Super Admin").
5. Copy the key immediately (it's shown only once).
6. In the app: Go to **Super Admin → N8N Workflows**.
7. Paste the key in **N8N API key**, click **Save**.
8. The **Workflows from N8N** table should list your workflows.

**Troubleshooting 502 Bad Gateway:**

The error message in the UI (under "Workflows from N8N") shows the actual cause. Common issues:

- **"N8N API key not configured"** → Paste your API key in Super Admin → N8N Workflows
- **"fetch failed" or "ECONNREFUSED"** → n8n container isn't running or backend can't reach it:
  - Check: `docker compose ps n8n` should show `Up (healthy)`
  - Restart: `docker compose restart n8n`
  - Verify network: Both backend and n8n are on `upora-network` (default in docker-compose.yml)
- **"N8N API error: 401"** → Wrong API key or key from different n8n instance:
  - Ensure the API key was created in Docker n8n (http://localhost:5678), not n8n Cloud
  - Create a new API key in Docker n8n and paste it again
- **Check backend logs:** `docker compose logs backend --tail=50` to see detailed error messages

The key is stored in message delivery settings (database). You can also set **N8N_API_KEY** in the backend environment if you prefer not to store it in the app.

---

## N8N Community Nodes (Install from UI vs manual)

When you click **Install** for a community node (e.g. SendMail) on **Super Admin → N8N Workflows**:

- **If Docker socket is available** (typical on **Linux**, e.g. EC2 or other cloud): The backend installs the node inside the N8N container and you only need to restart N8N.
- **If Docker socket is not available** (common on **Windows** with Docker Desktop): The UI shows a **manual command** and a **Copy** button. Run that command in your terminal, then restart N8N.

### Can I fix Docker socket access on Windows?

Sometimes. Try in order:

1. **Use WSL2 backend**  
   Docker Desktop → **Settings** → **General** → enable **Use the WSL 2 based engine**. Restart Docker, then from the project root run:
   ```bash
   docker compose up -d --force-recreate backend
   ```
   so the backend container is recreated with the socket mount.

2. **Run from WSL2**  
   Open the project in WSL2 (e.g. `\\wsl$\Ubuntu\home\...`) and run `docker compose` from a WSL2 terminal. The socket mount is more reliable there.

3. **If it still fails**  
   Use the **manual command** the UI shows; it does the same thing and works from any folder (see below).

### Will this happen on EC2 or in the cloud?

**No.** On a **Linux** host (EC2, ECS, Coolify, etc.) the Docker socket is at `/var/run/docker.sock` and the backend container can mount it. So the **Install** button should work there without needing the manual command. The limitation is mainly **Windows + Docker Desktop**.

### Can I run the manual command from any folder?

**Yes.** The command runs inside the N8N container and does not depend on your current directory. You can run it from any folder. Requirements:

- Docker is running.
- The N8N container is running (e.g. `docker compose ps n8n` shows it).
- The container name is `upora-n8n` (or whatever you set in `N8N_CONTAINER_NAME`).

Example (you can run this from any directory):

```bash
docker exec upora-n8n sh -c "mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install n8n-nodes-sendmail-10kcodeurs"
```

Then restart N8N so the node appears:

```bash
docker compose restart n8n
```

(If your project lives in a specific folder, run `docker compose restart n8n` from that project root so Compose finds the right stack; the `docker exec` line above is fine from anywhere.)

---

## SMTP2GO setup (recommended)

SMTP2GO has a **free tier** (e.g. 1,000 emails/month) and works well for “Also send by email”. You can later replace the credentials with Google Workspace SMTP (company email) without changing the app.

### 1. Sign up and create an SMTP user

1. Sign up at [SMTP2GO](https://www.smtp2go.com).
2. In the dashboard: **Settings → SMTP Users** (or **Sending → SMTP Users**).
3. Click **Add SMTP User** (or **Create SMTP User**).
4. Choose a **username** and **password** (use a strong password; you’ll enter these in the app). Note the username – it’s often your email or a name you choose.

### 2. SMTP server details

Use these in **Super Admin → Messages & Email** when delivery method is **SMTP**:

| Field      | Value |
|-----------|--------|
| **SMTP host** | `mail.smtp2go.com` (or `mail-us.smtp2go.com` / `mail-eu.smtp2go.com` for region) |
| **Port**      | `2525` (recommended) or `587` |
| **Use SSL/TLS** | Leave **unchecked** for port 2525 or 587. For port 465, check it. |
| **Username**   | The SMTP user you created |
| **Password**   | The SMTP user’s password (or set `SMTP_PASSWORD` in the backend env and leave password blank in the UI) |

### 3. Sender verification

- In SMTP2GO: **Sending → Sender Domains** (or **Single Senders**) and verify the domain or address you want to send from.
- In the app, set **From email address** to that verified address (e.g. `noreply@yourdomain.com`) and **From name** (e.g. “Upora Team”).

### 4. Save in the app

- Go to **Super Admin → Messages & Email**.
- Choose **SMTP** as the delivery method.
- Enter host, port, username, password, and from name/address.
- Click **Save settings**.

---

## Brevo (formerly Sendinblue) SMTP

Brevo offers a **free tier** (300 emails/day) and works well for message email delivery.

### 1. Sign up and get SMTP credentials

1. Sign up at [Brevo](https://www.brevo.com) (free account).
2. Go to **Settings** → **SMTP & API** → **SMTP**.
3. Note your SMTP credentials:
   - **Server:** `smtp-relay.brevo.com`
   - **Port:** `587` (recommended) or `465` (SSL)
   - **Login:** Your Brevo account email (or create an SMTP key for better security)
   - **Password:** Your Brevo SMTP key (create one in **SMTP & API** → **SMTP** → **Generate new SMTP key**)

### 2. Configure in N8N workflow

**Option A – Message email (Brevo) template (recommended)**  
Uses Brevo’s HTTP API (no SMTP credential in N8N):

1. In **Super Admin → N8N Workflows**, under **Import Templates**, click **Import** for **Message email (Brevo)**.
2. Open the new workflow in N8N.
3. Open the **Send Email via Brevo API** node and replace `YOUR_BREVO_API_KEY_HERE` in the **api-key** header with your Brevo API key (Settings → SMTP & API → API Keys).
4. Activate the workflow, then in **Super Admin → N8N Workflows**, click **"Select use case"** on the workflow and choose **"Sending emails"** → **Save**. (See `N8N_WORKFLOW_PURPOSES_GUIDE.md` for full details.)

**Option B – Message email (SMTP)** template (generic SMTP, e.g. Brevo SMTP):

1. Import the template in **Super Admin → N8N Workflows** (or import manually from `Upora/n8n/workflows/upora-message-email-smtp.json`).
2. Open the workflow in N8N.
3. Click the **Send Email** node.
4. Click **Credential to connect with** → **Create New** → **Send Email (SMTP)**.
5. Fill in:
   - **User:** Your Brevo SMTP login (email or SMTP key name)
   - **Password:** Your Brevo SMTP key
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Secure:** Leave unchecked (port 587 uses STARTTLS)
6. Save the credential (e.g. name it **Brevo SMTP**).
7. Select this credential in the **Send Email** node.
8. **Activate** the workflow.
9. In **Super Admin → N8N Workflows**, click **"Select use case"** on the workflow and choose **"Sending emails"** → **Save**. (See `N8N_WORKFLOW_PURPOSES_GUIDE.md`.)

### 3. Sender verification

- In Brevo: **Senders** → **Add a sender** and verify your email address or domain.
- In the workflow or app config, set **From email address** to a verified sender.

---

## Google Workspace (company email) later

To send from your company Google-hosted email:

1. In **Super Admin → Messages & Email**, set delivery method to **SMTP**.
2. Use:
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Use SSL/TLS:** unchecked (port 587 uses STARTTLS)
   - **Username:** your full Google email (e.g. `you@company.com`)
   - **Password:** your Google account password, or an [App Password](https://support.google.com/accounts/answer/185833) if you use 2FA (recommended)
3. Set **From name** and **From email address** to the same sender.

No app code changes needed – only the credentials in the config.

---

## Message email webhook URL

When delivery method is **N8N webhook**, the app POSTs to a webhook URL. Set that URL in **Super Admin → Messages & Email** (field **N8N webhook URL**), or on **Super Admin → N8N Workflows** by clicking **Use for message email** on a workflow that has a webhook. The workflows table shows production webhook URLs; picking one sets it as the message-email webhook and switches delivery method to N8N webhook.

---

## N8N webhook with SMTP2GO (one webhook in use)

You can use **one N8N webhook** and have N8N send email via SMTP2GO. The app only stores the webhook URL; SMTP2GO credentials live in N8N.

### 1. Get SMTP2GO credentials

1. Sign up at [SMTP2GO](https://www.smtp2go.com) (free tier: e.g. 1,000 emails/month).
2. In SMTP2GO: **Settings → SMTP Users** → **Add SMTP User**. Set a **username** and **password** and save.
3. Note these for N8N:
   - **Host:** `mail.smtp2go.com` (or `mail-us.smtp2go.com` / `mail-eu.smtp2go.com`)
   - **Port:** `2525` (or `587`)
   - **Secure:** off for 2525/587; use port `465` with SSL if you prefer.
   - **Username** and **Password:** the SMTP user you created.
4. In SMTP2GO: **Sending → Sender Domains** or **Single Senders** – verify the address you want as “From” (e.g. `noreply@yourdomain.com`).

### 2. Create the N8N workflow

**Option A (from the app):** Go to **Super Admin → N8N Workflows**, paste your N8N API key and save, then under **Import template** click **Import into N8N** for **Message email (SMTP)**. The workflow is created in N8N; open it there to configure the API key and activate.

**Option B (manual):** In N8N: **Workflows** → **Import from File** (or **Add workflow** → **Import**). Import the file from this repo: **`Upora/n8n/workflows/upora-message-email-smtp.json`**.

The workflow has three nodes: **Webhook** (POST) → **Send Email via SMTP2GO API** (HTTP Request) → **Respond to Webhook**. The app POSTs a JSON payload with `toUserEmail`, `title`, `body`, and optionally `fromAddress` to the webhook. See **Payload Format** button in Super Admin → N8N Workflows for the exact structure.

### 3. Configure SMTP2GO API key in N8N

1. In N8N, open the imported workflow.
2. Click the **Send Email via SMTP2GO API** node.
3. In the **Header Parameters** section, find the **X-Smtp2go-Api-Key** header.
4. Replace `YOUR_SMTP2GO_API_KEY_HERE` with your actual SMTP2GO API key (from step 1).
5. Save the workflow.

### 5. Activate and get the webhook URL

1. **Activate** the workflow (toggle in the top right).
2. Open the **Webhook** node and copy the **Production URL** (e.g. `https://your-n8n.example.com/webhook/upora-message-email-smtp` or similar).

### 6. Configure the app

1. In the app: **Super Admin → Messages & Email**.
2. Choose **N8N webhook** as the delivery method.
3. Paste the **N8N Webhook URL** you copied.
4. Set **From name** and **From email address** (e.g. “Upora Team” and your verified SMTP2GO sender address). The app sends these in the webhook body so the Send Email node can use them.
5. Click **Save settings**.

After this, when a user checks **“Also send by email”**, the app POSTs to your N8N webhook and N8N sends the email via SMTP2GO. You have one webhook in use, with SMTP credentials only in N8N.

---

## N8N webhook option (other providers)

You can also use the N8N webhook with **SendGrid** (import `n8n/workflows/upora-message-email.json` and add a SendGrid API credential) or any other provider you configure in N8N. The app only needs the webhook URL; all email credentials stay in N8N.

---

## Super Admin panel summary

**Super Admin → Messages & Email** lets you set:

- **Delivery method:** SMTP or N8N webhook.
- **SMTP (when chosen):** host, port, secure, username, password. Optional: set `SMTP_PASSWORD` in backend env instead of storing the password in the DB.
- **N8N (when chosen):** webhook URL (or use env `N8N_MESSAGES_WEBHOOK_URL`).
- **From name / From email address:** used for both SMTP and N8N as the sender.
