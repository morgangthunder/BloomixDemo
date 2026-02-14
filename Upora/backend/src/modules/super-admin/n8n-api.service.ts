import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Writable } from 'stream';
import Docker from 'dockerode';
import { MessageDeliverySettingsService } from '../message-delivery-settings/message-delivery-settings.service';

export interface PopularNode {
  name: string;
  package: string;
  description: string;
  weeklyDownloads?: number;
}

/**
 * Workflow purpose definitions. Each purpose is a use case a workflow can be assigned to.
 * Add new entries here as you develop new features that need N8N workflows.
 * See N8N_WORKFLOW_PURPOSES_GUIDE.md for full documentation.
 */
export interface WorkflowPurpose {
  key: string;
  displayName: string;
  description: string;
  /** Expected webhook payload fields (for documentation in the UI). */
  payloadFields?: string[];
}

export const WORKFLOW_PURPOSES: WorkflowPurpose[] = [
  {
    key: 'message_email',
    displayName: 'Sending emails',
    description: 'Sends email when a user checks "Also send by email" on a message. Receives toUserEmail, title, body, fromAddress, fromName.',
    payloadFields: ['toUserEmail', 'title', 'body', 'fromAddress', 'fromName', 'messageId', 'toUserId', 'fromUserId', 'createdAt'],
  },
  // Future purposes – uncomment or add as needed:
  // {
  //   key: 'lesson_completion',
  //   displayName: 'Lesson completion',
  //   description: 'Triggered when a student completes a lesson. Could send a certificate email or update a spreadsheet.',
  //   payloadFields: ['userId', 'lessonId', 'lessonTitle', 'completedAt'],
  // },
  // {
  //   key: 'admin_alerts',
  //   displayName: 'Admin alerts',
  //   description: 'Sends alerts to admins (e.g. new sign-ups, content flagged). Could go to Slack, email, or a dashboard.',
  //   payloadFields: ['alertType', 'message', 'userId', 'timestamp'],
  // },
];

export interface WorkflowPurposeAssignment {
  workflowId: string;
  webhookUrl: string;
  workflowName: string;
  assignedAt: string;
}

const N8N_API_PREFIX = '/api/v1';

/** Workflow template metadata. */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category?: 'content-analysis' | 'message-delivery' | 'data-processing' | 'other';
  /** Pattern to match workflow names from this template (for detecting if already imported). */
  workflowNamePattern: string;
}

/** Whitelist of workflow template IDs (filename without .json) that can be imported. */
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'upora-message-email-smtp',
    name: 'Message email (SMTP2GO)',
    description: 'Webhook → HTTP Request to SMTP2GO API. Replace YOUR_SMTP2GO_API_KEY_HERE in the node with your API key.',
    category: 'message-delivery',
    workflowNamePattern: 'Send message as email (SMTP)',
  },
  {
    id: 'upora-message-email-brevo',
    name: 'Message email (Brevo)',
    description: 'Webhook → Build payload → HTTP Request to Brevo API. Replace YOUR_BREVO_API_KEY_HERE in the Send Email node with your Brevo API key.',
    category: 'message-delivery',
    workflowNamePattern: 'Send message as email (Brevo)',
  },
  {
    id: 'upora-message-email',
    name: 'Message email (SendGrid)',
    description: 'Webhook receives message data and sends email via SendGrid API. Configure SendGrid API key in N8N.',
    category: 'message-delivery',
    workflowNamePattern: 'Send message as email',
  },
  {
    id: 'upora-message-email-sendmail',
    name: 'Message email (SendMail)',
    description: 'Webhook → SendMail node. Install the n8n-nodes-sendmail community node via the N8N Nodes tab, restart N8N, then import this template; the node type is resolved automatically so the workflow works without manual reconnection.',
    category: 'message-delivery',
    workflowNamePattern: 'Send message as email (SendMail)',
  },
  {
    id: 'upora-test-google-sheets',
    name: 'Test Google Sheets',
    description: 'Webhook → Google Sheets append. Requires n8n-nodes-google-sheets (built-in). Configure Google Sheets OAuth2 credentials in N8N.',
    category: 'data-processing',
    workflowNamePattern: 'Test Google Sheets',
  },
  {
    id: 'upora-message-email-sendmail-v2',
    name: 'Send Email via SendMail (v2)',
    description: 'Webhook → SendMail node (v2). Install n8n-nodes-sendmail via the N8N Nodes tab, restart N8N, then import; the node type is resolved automatically.',
    category: 'message-delivery',
    workflowNamePattern: 'Send Email via SendMail',
  },
  {
    id: 'upora-test-notionmd',
    name: 'Test Notion MD (Markdown ↔ Notion)',
    description: 'Webhook → Notion MD node. Install n8n-nodes-notionmd via the N8N Nodes tab, restart N8N, then import. Converts Markdown to Notion blocks. No API key needed.',
    category: 'data-processing',
    workflowNamePattern: 'Test Notion MD',
  },
];

export interface N8nWorkflowListItem {
  id: string;
  name: string;
  active: boolean;
  webhookPaths: string[];
  productionWebhookUrls: string[];
}

export interface N8nWorkflowDetail {
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{ type?: string; parameters?: Record<string, unknown> }>;
  webhookPaths: string[];
  productionWebhookUrls: string[];
}

@Injectable()
export class N8nApiService {
  private readonly logger = new Logger(N8nApiService.name);

  constructor(private readonly messageDeliverySettings: MessageDeliverySettingsService) {}

  private getBaseUrl(): string {
    const url = process.env.N8N_API_BASE_URL?.trim() || process.env.N8N_UI_URL?.trim() || 'http://localhost:5678';
    return url.replace(/\/$/, '');
  }

  private async getApiKey(): Promise<string | null> {
    const fromEnv = process.env.N8N_API_KEY?.trim();
    if (fromEnv) return fromEnv;
    const settings = await this.messageDeliverySettings.getSettings();
    return settings.n8nApiKey?.trim() || null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('N8N API key not configured. Set it in Super Admin → N8N Workflows or N8N_API_KEY env.');
    }
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-N8N-API-KEY': apiKey,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`N8N API ${method} ${path} network error: ${msg}`);
      throw new Error(`Failed to reach N8N at ${baseUrl}: ${msg}. Ensure n8n container is running and N8N_API_BASE_URL is correct.`);
    }
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`N8N API ${method} ${path} failed: ${res.status} ${text}`);
      throw new Error(`N8N API error: ${res.status} ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private extractWebhookPaths(nodes: Array<{ type?: string; parameters?: Record<string, unknown> }>): string[] {
    const paths: string[] = [];
    for (const node of nodes || []) {
      if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.path) {
        const p = String(node.parameters.path).trim();
        if (p) paths.push(p);
      }
    }
    return paths;
  }

  private buildProductionWebhookUrls(webhookPaths: string[]): string[] {
    const base = this.getBaseUrl();
    const webhookBase = `${base}/webhook`;
    return webhookPaths.map((p) => `${webhookBase}/${p}`);
  }

  async listWorkflows(): Promise<N8nWorkflowListItem[]> {
    const res = await this.request<{ data?: Array<{ id: string; name: string; active: boolean; nodes?: unknown[] }> }>(
      'GET',
      `${N8N_API_PREFIX}/workflows?limit=100`,
    );
    const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
    return list.map((w) => {
      const nodes = (w.nodes ?? []) as Array<{ type?: string; parameters?: Record<string, unknown> }>;
      const webhookPaths = this.extractWebhookPaths(nodes);
      const productionWebhookUrls = this.buildProductionWebhookUrls(webhookPaths);
      return {
        id: w.id,
        name: w.name,
        active: !!w.active,
        webhookPaths,
        productionWebhookUrls,
      };
    });
  }

  async getWorkflow(id: string): Promise<N8nWorkflowDetail> {
    const res = await this.request<{ data?: { id: string; name: string; active: boolean; nodes?: unknown[] }; id?: string }>(
      'GET',
      `${N8N_API_PREFIX}/workflows/${id}`,
    );
    const w = (res as any)?.data ?? res;
    const nodes = (w.nodes ?? []) as Array<{ type?: string; parameters?: Record<string, unknown> }>;
    const webhookPaths = this.extractWebhookPaths(nodes);
    const productionWebhookUrls = this.buildProductionWebhookUrls(webhookPaths);
    return {
      id: w.id,
      name: w.name,
      active: !!w.active,
      nodes,
      webhookPaths,
      productionWebhookUrls,
    };
  }

  async setWorkflowActive(id: string, active: boolean): Promise<void> {
    if (active) {
      await this.request('POST', `${N8N_API_PREFIX}/workflows/${id}/activate`);
    } else {
      await this.request('POST', `${N8N_API_PREFIX}/workflows/${id}/deactivate`);
    }
  }

  /**
   * Delete a workflow in N8N. If N8N returns 404 (workflow already deleted or missing),
   * treats as success so the UI can refresh the list.
   */
  async deleteWorkflow(id: string): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('N8N API key not configured. Set it in Super Admin → N8N Workflows or N8N_API_KEY env.');
    }
    const path = `${N8N_API_PREFIX}/workflows/${id}`;
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-N8N-API-KEY': apiKey,
      },
    });
    if (res.status === 404) {
      this.logger.log(`N8N workflow ${id} not found (already deleted or missing), treating as success`);
      return;
    }
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`N8N API DELETE ${path} failed: ${res.status} ${text}`);
      throw new Error(`N8N API error: ${res.status} ${text || res.statusText}`);
    }
  }

  async createWorkflow(workflow: Record<string, unknown>): Promise<N8nWorkflowDetail> {
    const res = await this.request<{ data?: { id: string; name: string; active: boolean; nodes?: unknown[] }; id?: string }>(
      'POST',
      `${N8N_API_PREFIX}/workflows`,
      workflow,
    );
    const w = (res as any)?.data ?? res;
    const nodes = (w.nodes ?? []) as Array<{ type?: string; parameters?: Record<string, unknown> }>;
    const webhookPaths = this.extractWebhookPaths(nodes);
    const productionWebhookUrls = this.buildProductionWebhookUrls(webhookPaths);
    return {
      id: w.id,
      name: w.name,
      active: !!w.active,
      nodes,
      webhookPaths,
      productionWebhookUrls,
    };
  }

  /** List available workflow templates (from repo n8n/workflows). */
  getWorkflowTemplates(): WorkflowTemplate[] {
    return [...WORKFLOW_TEMPLATES];
  }

  /** Import a workflow template into N8N by name. Template must be in WORKFLOW_TEMPLATES. */
  async importWorkflowTemplate(templateId: string): Promise<N8nWorkflowDetail> {
    const allowed = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!allowed) {
      throw new Error(`Unknown template: ${templateId}. Allowed: ${WORKFLOW_TEMPLATES.map((t) => t.id).join(', ')}`);
    }
    const basePath = process.env.N8N_WORKFLOWS_PATH?.trim() || '/app/n8n-workflows';
    const filePath = join(basePath, `${templateId}.json`);
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      this.logger.warn(`Failed to read workflow template ${templateId}: ${err}`);
      throw new Error(`Workflow template file not found: ${templateId}.json (path: ${basePath})`);
    }
    let workflow: Record<string, unknown>;
    try {
      workflow = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid JSON in workflow template: ${templateId}.json`);
    }
    // Resolve community node types so N8N recognises nodes installed via our UI.
    // For each node that references a community package (type starts with n8n-nodes- but not n8n-nodes-base),
    // resolve the correct type from the installed package in the container.
    if (Array.isArray(workflow.nodes)) {
      const communityNodes = (workflow.nodes as any[]).filter((n: any) => {
        const t = n.type as string;
        return t && t.startsWith('n8n-nodes-') && !t.startsWith('n8n-nodes-base.');
      });
      // Collect unique package names from community node types (e.g. "n8n-nodes-sendmail.sendMail10K..." → "n8n-nodes-sendmail")
      const packageNames = new Set<string>();
      for (const n of communityNodes) {
        const t = n.type as string;
        const dotIdx = t.indexOf('.');
        if (dotIdx > 0) packageNames.add(t.substring(0, dotIdx));
      }
      // Resolve each package's node type
      const resolvedTypes = new Map<string, string>();
      for (const pkg of packageNames) {
        const resolved = await this.getResolvedNodeType(pkg);
        if (resolved) {
          resolvedTypes.set(pkg, resolved);
          this.logger.log(`Template ${templateId}: resolved ${pkg} → ${resolved}`);
        } else {
          this.logger.warn(`Template ${templateId}: could not resolve type for ${pkg}, keeping original`);
        }
      }
      // Replace node types with resolved ones
      if (resolvedTypes.size > 0) {
        (workflow.nodes as any[]) = (workflow.nodes as any[]).map((node: any) => {
          const t = node.type as string;
          if (!t || !t.startsWith('n8n-nodes-') || t.startsWith('n8n-nodes-base.')) return node;
          const dotIdx = t.indexOf('.');
          if (dotIdx <= 0) return node;
          const pkg = t.substring(0, dotIdx);
          const resolved = resolvedTypes.get(pkg);
          if (resolved && resolved !== t) {
            this.logger.log(`Template ${templateId}: replacing node type ${t} → ${resolved}`);
            return { ...node, type: resolved };
          }
          return node;
        });
      }
    }
    // Clean workflow for N8N API: name, nodes, connections, and settings are required
    const cleaned: Record<string, unknown> = {
      name: workflow.name || allowed.name,
      nodes: Array.isArray(workflow.nodes) ? (workflow.nodes as any[]).map((node: any) => {
        // Remove webhookId, credentials (set in N8N UI), and other non-API fields
        const { webhookId, credentials, ...cleanNode } = node;
        return cleanNode;
      }) : [],
      connections: workflow.connections || {},
      settings: workflow.settings || { executionOrder: 'v1' },
    };
    return this.createWorkflow(cleaned);
  }

  /**
   * Import a workflow from pasted JSON (e.g. from N8N export). Cleans and creates in N8N.
   */
  async importWorkflowFromJson(json: string): Promise<N8nWorkflowDetail> {
    let workflow: Record<string, unknown>;
    try {
      workflow = JSON.parse(json) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON');
    }
    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Invalid workflow object');
    }
    const name = typeof workflow.name === 'string' ? workflow.name : 'Imported workflow';
    const nodes = Array.isArray(workflow.nodes)
      ? (workflow.nodes as any[]).map((node: any) => {
          const { webhookId, credentials, pinData, staticData, meta, ...cleanNode } = node;
          return cleanNode;
        })
      : [];
    const cleaned: Record<string, unknown> = {
      name,
      nodes,
      connections: workflow.connections || {},
      settings: workflow.settings && typeof workflow.settings === 'object' ? workflow.settings : { executionOrder: 'v1' },
    };
    return this.createWorkflow(cleaned);
  }

  /**
   * Get Docker client instance.
   * Uses Docker socket or TCP connection based on environment.
   */
  private getDockerClient(): Docker {
    // Try socket first (works when Docker socket is mounted in container)
    // On Windows host, Docker Desktop exposes socket at /var/run/docker.sock when mounted
    // On Linux/Mac, same path works
    try {
      return new Docker({ socketPath: '/var/run/docker.sock' });
    } catch {
      // Fallback: try Windows named pipe (if running directly on Windows, not in container)
      try {
        return new Docker({ socketPath: '\\\\.\\pipe\\docker_engine' });
      } catch {
        // Final fallback: use default Docker connection (may use DOCKER_HOST env var)
        return new Docker();
      }
    }
  }

  /**
   * Build the manual command to install a community node (for when Docker socket is not available).
   */
  getManualInstallCommand(packageName: string): string {
    const containerName = process.env.N8N_CONTAINER_NAME || 'upora-n8n';
    const nodesDir = '/home/node/.n8n/nodes';
    return `docker exec ${containerName} sh -c "mkdir -p ${nodesDir} && cd ${nodesDir} && npm install ${packageName}"`;
  }

  /**
   * Install a community node in N8N via Docker exec.
   * If Docker is not available (e.g. socket not mounted on Windows), returns manualCommand for user to run.
   * @param packageName - npm package name (e.g., 'n8n-nodes-sendmail-10kcodeurs')
   * @returns Installation output or manualCommand
   */
  async installCommunityNode(packageName: string): Promise<{
    success: boolean;
    message?: string;
    output?: string;
    error?: string;
    manualCommand?: string;
    alreadyInstalled?: boolean;
  }> {
    // Validate package name format
    if (!packageName.match(/^(@?[a-z0-9-]+[\/])?[a-z0-9-]+$/i)) {
      throw new Error(`Invalid package name: ${packageName}. Must be a valid npm package name.`);
    }

    const containerName = process.env.N8N_CONTAINER_NAME || 'upora-n8n';
    const nodesDir = '/home/node/.n8n/nodes';

    try {
      const docker = this.getDockerClient();
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find((c) => 
        c.Names?.some((n) => n.includes(containerName)) || c.Id.startsWith(containerName)
      );

      if (!containerInfo) {
        throw new Error(`Container ${containerName} not found`);
      }

      const container = docker.getContainer(containerInfo.Id);

      // Ensure nodes directory exists
      const mkdirExec = await container.exec({
        Cmd: ['sh', '-c', `mkdir -p ${nodesDir}`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const mkdirStream = await mkdirExec.start({ hijack: true, stdin: false });
      await new Promise<void>((resolve) => {
        mkdirStream.on('end', () => resolve());
        mkdirStream.on('error', () => resolve()); // Ignore errors for mkdir
        mkdirStream.resume(); // Start reading
      });

      // Install the node package
      this.logger.log(`Installing N8N community node: ${packageName}`);
      const installExec = await container.exec({
        Cmd: ['sh', '-c', `cd ${nodesDir} && npm install ${packageName}`],
        AttachStdout: true,
        AttachStderr: true,
      });

      const installStream = await installExec.start({ hijack: true, stdin: false });
      
      // Collect output using writable streams
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      const stdoutStream = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });
      const stderrStream = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Installation timeout after 2 minutes'));
        }, 120000);

        // Demux stdout and stderr
        docker.modem.demuxStream(installStream, stdoutStream, stderrStream);

        installStream.on('end', () => {
          clearTimeout(timeout);
          const stdout = Buffer.concat(stdoutChunks).toString();
          const stderr = Buffer.concat(stderrChunks).toString();
          const combinedOutput = stdout + '\n' + stderr;

          // Check for npm errors in both stdout and stderr (npm sometimes outputs errors to stdout)
          if (combinedOutput.includes('npm ERR') || combinedOutput.includes('404 Not Found') || combinedOutput.includes('E404')) {
            const errorMatch = combinedOutput.match(/npm error[^\n]*(?:\n[^\n]*)*/i);
            const errorMsg = errorMatch ? errorMatch[0] : (stderr || stdout);
            this.logger.error(`N8N node installation failed for ${packageName}: ${errorMsg}`);
            resolve({
              success: false,
              output: stdout,
              error: errorMsg.trim(),
            });
            return;
          }
          // Same version already installed (npm reports "added 0 packages" or "up to date")
          const alreadyInstalled =
            /added 0 packages/i.test(combinedOutput) ||
            /up to date/i.test(combinedOutput) ||
            /already up to date/i.test(combinedOutput);
          if (alreadyInstalled) {
            this.logger.log(`N8N community node already installed: ${packageName}`);
            // Ensure it's registered in N8N's DB even if npm says "already installed"
            this.registerCommunityNodeInDb(container, packageName).catch((regErr) => {
              this.logger.warn(`Failed to register ${packageName} in N8N DB: ${regErr instanceof Error ? regErr.message : String(regErr)}`);
            });
            resolve({
              success: true,
              message: 'Same version of this node is already installed.',
              alreadyInstalled: true,
              output: stdout,
            });
            return;
          }
          this.logger.log(`Successfully installed N8N community node: ${packageName}`);
          // Register in N8N's database so it recognizes the node (N8N v2 uses DB, not filesystem)
          this.registerCommunityNodeInDb(container, packageName).catch((regErr) => {
            this.logger.warn(`Failed to register ${packageName} in N8N DB (node may not appear until manual install via N8N UI): ${regErr instanceof Error ? regErr.message : String(regErr)}`);
          });
          resolve({
            success: true,
            output: stdout,
            error: stderr && !stderr.includes('npm WARN') && !stderr.includes('npm notice') ? stderr : undefined,
          });
        });

        installStream.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        installStream.resume(); // Start reading
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to install N8N community node ${packageName}: ${errorMsg}`);
      // When Docker socket is not available (e.g. Windows), return manual command instead of throwing
      if (errorMsg.includes('docker.sock') || errorMsg.includes('ENOENT') || errorMsg.includes('connect ECONNREFUSED')) {
        const manualCommand = this.getManualInstallCommand(packageName);
        this.logger.log(`Docker not available from backend; returning manual command for ${packageName}`);
        return {
          success: false,
          manualCommand,
          error: 'Docker is not available from the backend (common on Windows). Use the command below.',
        };
      }
      throw new Error(`Failed to install node: ${errorMsg}`);
    }
  }

  /**
   * Register an npm-installed community package in N8N's SQLite database.
   * N8N v2 uses the `installed_packages` and `installed_nodes` tables to track community nodes.
   * Without this, N8N shows "Install this node" even though the package files exist on disk.
   */
  private async registerCommunityNodeInDb(container: Docker.Container, packageName: string): Promise<void> {
    const nodesDir = '/home/node/.n8n/nodes/node_modules';
    // Build a self-contained Node.js script to run inside the N8N container
    const script = `
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const PKG = "${packageName}";
const PKG_DIR = path.join("${nodesDir}", PKG);
const DB_PATH = "/home/node/.n8n/database.sqlite";

try {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(PKG_DIR, "package.json"), "utf-8"));
  const version = pkgJson.version || "0.0.0";
  const authorName = typeof pkgJson.author === "string" ? pkgJson.author : (pkgJson.author?.name || "");
  const authorEmail = typeof pkgJson.author === "object" ? (pkgJson.author?.email || "") : "";
  const n8nCfg = pkgJson.n8n || {};
  const nodeFiles = n8nCfg.nodes || [];
  const credFiles = n8nCfg.credentials || [];

  // Fix credentials path issue: if credential file in package.json includes a subdir that doesn't exist, copy it
  for (const credFile of credFiles) {
    const fullPath = path.join(PKG_DIR, credFile);
    if (!fs.existsSync(fullPath)) {
      const basename = path.basename(credFile);
      const parentDir = path.dirname(fullPath);
      const altPath = path.join(path.dirname(parentDir), basename);
      if (fs.existsSync(altPath)) {
        fs.mkdirSync(parentDir, { recursive: true });
        fs.copyFileSync(altPath, fullPath);
        // Also copy .d.ts and .map if they exist
        const base = basename.replace(/\\.js$/, "");
        for (const ext of [".d.ts", ".js.map"]) {
          const src = path.join(path.dirname(parentDir), base + ext);
          if (fs.existsSync(src)) fs.copyFileSync(src, path.join(parentDir, base + ext));
        }
      }
    }
  }

  // Extract node types from .node.js files
  const nodeTypes = [];
  for (const nf of nodeFiles) {
    const fp = path.join(PKG_DIR, nf);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, "utf-8");
    const m = content.match(/description\\s*=\\s*\\{[\\s\\S]*?name:\\s*['"]([^'"]+)['"]/);
    if (m) nodeTypes.push({ name: m[1], type: PKG + "." + m[1] });
  }

  const db = new DatabaseSync(DB_PATH);
  // Check if already registered
  const existing = db.prepare("SELECT packageName FROM installed_packages WHERE packageName = ?").all(PKG);
  if (existing.length === 0) {
    db.prepare("INSERT INTO installed_packages (packageName, installedVersion, authorName, authorEmail, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)").run(PKG, version, authorName, authorEmail, new Date().toISOString(), new Date().toISOString());
  } else {
    db.prepare("UPDATE installed_packages SET installedVersion = ?, updatedAt = ? WHERE packageName = ?").run(version, new Date().toISOString(), PKG);
  }
  for (const nt of nodeTypes) {
    const ex = db.prepare("SELECT name FROM installed_nodes WHERE name = ?").all(nt.type);
    if (ex.length === 0) {
      db.prepare("INSERT INTO installed_nodes (name, type, latestVersion, package) VALUES (?, ?, ?, ?)").run(nt.type, nt.type, version, PKG);
    }
  }
  db.close();
  console.log(JSON.stringify({ ok: true, package: PKG, version, nodeTypes: nodeTypes.map(n => n.type) }));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
}
`.trim();

    const exec = await container.exec({
      Cmd: ['node', '-e', script],
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const outW = new Writable({
      write(chunk: Buffer | string, _: string, cb: (err?: Error) => void) {
        outChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });
    const errW = new Writable({
      write(chunk: Buffer | string, _: string, cb: (err?: Error) => void) {
        errChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    });
    const docker = this.getDockerClient();
    await new Promise<void>((resolve) => {
      docker.modem.demuxStream(stream, outW, errW);
      stream.on('end', () => resolve());
      stream.on('error', () => resolve());
      stream.resume();
    });
    const stdout = Buffer.concat(outChunks).toString().trim();
    const stderr = Buffer.concat(errChunks).toString().trim();
    if (stderr && stderr.includes('"ok":false')) {
      this.logger.warn(`Failed to register ${packageName} in N8N DB: ${stderr}`);
    } else {
      this.logger.log(`Registered ${packageName} in N8N DB: ${stdout}`);
    }
  }

  /**
   * Fetch popular n8n community nodes from npm registry.
   * Uses npm search API to find packages with n8n-community-node-package keyword.
   */
  async fetchPopularNodes(limit: number = 50): Promise<PopularNode[]> {
    try {
      // Use npm registry search API
      const searchUrl = `https://registry.npmjs.org/-/v1/search?text=keywords:n8n-community-node-package&size=${limit}&popularity=1.0`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        this.logger.warn(`Failed to fetch popular nodes from npm: ${response.status}`);
        return this.getDefaultPopularNodes();
      }

      const data = await response.json() as { objects?: Array<{ package: { name: string; description?: string; keywords?: string[] }; score: { final: number } }> };
      
      if (!data.objects || data.objects.length === 0) {
        return this.getDefaultPopularNodes();
      }

      // Map npm results to PopularNode format
      const nodes: PopularNode[] = data.objects
        .filter((item) => item.package.name.startsWith('n8n-nodes-'))
        .map((item) => {
          // Extract node name from package name (e.g., "n8n-nodes-sendmail" -> "SendMail")
          const name = item.package.name
            .replace(/^n8n-nodes-/, '')
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          return {
            name,
            package: item.package.name,
            description: item.package.description || `n8n community node: ${name}`,
            weeklyDownloads: Math.round(item.score.final * 1000), // Approximate from score
          };
        })
        .slice(0, limit);

      this.logger.debug(`Fetched ${nodes.length} popular nodes from npm`);
      return nodes.length > 0 ? nodes : this.getDefaultPopularNodes();
    } catch (err) {
      this.logger.warn(`Error fetching popular nodes from npm: ${err instanceof Error ? err.message : String(err)}`);
      return this.getDefaultPopularNodes();
    }
  }

  /**
   * Search npm for n8n community nodes by query (name, package, or keyword).
   */
  async searchNodes(query: string, limit: number = 20): Promise<PopularNode[]> {
    const q = query?.trim();
    if (!q) return [];

    try {
      // npm search: search by query + n8n to get n8n nodes; filter to n8n-nodes-* in results
      const searchUrl = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}%20n8n&size=${Math.max(limit, 50)}`;
      const response = await fetch(searchUrl);
      if (!response.ok) return [];

      const data = await response.json() as { objects?: Array<{ package: { name: string; description?: string }; score: { final: number } }> };
      if (!data.objects || data.objects.length === 0) return [];

      const nodes: PopularNode[] = data.objects
        .filter((item) => item.package.name.startsWith('n8n-nodes-'))
        .map((item) => {
          const name = item.package.name
            .replace(/^n8n-nodes-/, '')
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          return {
            name,
            package: item.package.name,
            description: item.package.description || `n8n community node: ${name}`,
          };
        })
        .slice(0, limit);
      return nodes;
    } catch (err) {
      this.logger.warn(`Search nodes failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Get default popular nodes (fallback if npm API fails).
   */
  private getDefaultPopularNodes(): PopularNode[] {
    return [
      {
        name: 'SendMail',
        package: 'n8n-nodes-sendmail',
        description: 'Send emails via SMTP with attachments, HTML, and custom headers',
      },
      {
        name: 'Slack',
        package: 'n8n-nodes-slack',
        description: 'Send messages and interact with Slack',
      },
      {
        name: 'Discord',
        package: 'n8n-nodes-discord',
        description: 'Send messages and interact with Discord',
      },
      {
        name: 'Puppeteer',
        package: 'n8n-nodes-puppeteer',
        description: 'Browser automation with Puppeteer',
      },
      {
        name: 'Playwright',
        package: 'n8n-nodes-playwright',
        description: 'Browser automation with Playwright',
      },
    ];
  }

  /**
   * Check if a specific node type is available in N8N (after restart).
   * Queries N8N's node types API to verify the node is actually loaded.
   */
  async isNodeTypeAvailable(nodeType: string): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      const apiKey = await this.getApiKey();
      if (!apiKey) return false;
      
      // Query N8N's node types endpoint (if available)
      // Note: N8N doesn't expose a public API for this, so we check by attempting to get node info
      // For now, we'll rely on the file system check, but this could be enhanced
      return false; // Placeholder - N8N doesn't expose node registry via API easily
    } catch {
      return false;
    }
  }

  /**
   * List installed community nodes in N8N.
   * @returns Array of installed node package names
   */
  async listInstalledCommunityNodes(): Promise<string[]> {
    const containerName = process.env.N8N_CONTAINER_NAME || 'upora-n8n';
    const nodesDir = '/home/node/.n8n/nodes';
    // npm install puts packages in node_modules/ (e.g. nodes/node_modules/n8n-nodes-sendmail-10kcodeurs)
    const nodeModulesDir = `${nodesDir}/node_modules`;

    try {
      const docker = this.getDockerClient();
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find((c) => 
        c.Names?.some((n) => n.includes(containerName)) || c.Id.startsWith(containerName)
      );

      if (!containerInfo) {
        this.logger.debug(`Container ${containerName} not found`);
        return [];
      }

      const container = docker.getContainer(containerInfo.Id);
      // List package names: node_modules/n8n-* (npm install puts packages here)
      // Also check for scoped packages like @n8n/*
      // Use a more robust command that handles edge cases
      const exec = await container.exec({
        Cmd: ['sh', '-c', `if [ -d "${nodeModulesDir}" ]; then { find "${nodeModulesDir}" -maxdepth 1 -type d -name "n8n-*" -exec basename {} \\;; find "${nodeModulesDir}/@n8n" -mindepth 2 -maxdepth 2 -type d -name "n8n-*" -exec basename {} \\; 2>/dev/null; } | sort -u; else echo ""; fi`],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: false });
      const stdoutChunks: Buffer[] = [];
      const stdoutStream = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });
      const stderrStream = new Writable({
        write(_chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          callback();
        },
      });

      return new Promise((resolve) => {
        docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        stream.on('end', () => {
          const stdout = Buffer.concat(stdoutChunks).toString();
          const packages = stdout
            .trim()
            .split('\n')
            .filter((pkg) => pkg && pkg.startsWith('n8n-'));
          this.logger.debug(`Found ${packages.length} installed community nodes: ${packages.join(', ')}`);
          resolve(packages);
        });

        stream.on('error', () => {
          resolve([]);
        });

        stream.resume(); // Start reading
      });
    } catch (err) {
      // If directory doesn't exist or is empty, return empty array
      this.logger.debug(`No community nodes found or error listing: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Get information about a specific installed node.
   * @param packageName - npm package name
   * @returns Package info from package.json
   */
  async getNodeInfo(packageName: string): Promise<{ name: string; version: string; description?: string; nodeTypes?: string[] } | null> {
    const containerName = process.env.N8N_CONTAINER_NAME || 'upora-n8n';
    const nodePath = `/home/node/.n8n/nodes/node_modules/${packageName}/package.json`;

    try {
      const docker = this.getDockerClient();
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find((c) => 
        c.Names?.some((n) => n.includes(containerName)) || c.Id.startsWith(containerName)
      );

      if (!containerInfo) {
        return null;
      }

      const container = docker.getContainer(containerInfo.Id);
      const exec = await container.exec({
        Cmd: ['cat', nodePath],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: false });
      const stdoutChunks: Buffer[] = [];
      const stdoutStream = new Writable({
        write(chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });
      const stderrStream = new Writable({
        write(_chunk: Buffer | string, _encoding: string, callback: (err?: Error) => void) {
          callback();
        },
      });

      return new Promise((resolve) => {
        docker.modem.demuxStream(stream, stdoutStream, stderrStream);

        stream.on('end', () => {
          try {
            const stdout = Buffer.concat(stdoutChunks).toString();
            const pkg = JSON.parse(stdout);
            // Extract node types from n8n field if available (community nodes declare their nodes here)
            const nodeTypes: string[] = [];
            if (pkg.n8n?.nodes) {
              // n8n.nodes is an array of node definitions
              for (const nodeDef of pkg.n8n.nodes) {
                if (nodeDef.type) nodeTypes.push(nodeDef.type);
              }
            }
            resolve({
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              nodeTypes: nodeTypes.length > 0 ? nodeTypes : undefined,
            });
          } catch {
            resolve(null);
          }
        });

        stream.on('error', () => {
          resolve(null);
        });

        stream.resume(); // Start reading
      });
    } catch {
      return null;
    }
  }

  /**
   * Resolve the exact node type string for an installed package (e.g. "n8n-nodes-sendmail.sendMail10Kcodeurs").
   * Reads the node file in the container and extracts the description.name so workflows use the correct type.
   */
  async getResolvedNodeType(packageName: string): Promise<string | null> {
    const containerName = process.env.N8N_CONTAINER_NAME || 'upora-n8n';
    const baseDir = `/home/node/.n8n/nodes/node_modules/${packageName}`;

    try {
      const docker = this.getDockerClient();
      const containers = await docker.listContainers({ all: true });
      const containerInfo = containers.find((c) =>
        c.Names?.some((n) => n.includes(containerName)) || c.Id.startsWith(containerName)
      );
      if (!containerInfo) return null;

      const container = docker.getContainer(containerInfo.Id);
      // Find first .node.js file under dist/nodes (package.json n8n.nodes e.g. "dist/nodes/X/X.node.js")
      const findExec = await container.exec({
        Cmd: ['sh', '-c', `find ${baseDir} -name "*.node.js" 2>/dev/null | head -1`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const findStream = await findExec.start({ hijack: true, stdin: false });
      const findChunks: Buffer[] = [];
      const findW = new Writable({
        write(chunk: Buffer | string, _: string, cb: (err?: Error) => void) {
          findChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          cb();
        },
      });
      const fullPath = await new Promise<string>((res) => {
        docker.modem.demuxStream(findStream, findW, new Writable({ write(_: any, __: string, cb: () => void) { cb(); } }));
        findStream.on('end', () => res(Buffer.concat(findChunks).toString().trim()));
        findStream.on('error', () => res(''));
        findStream.resume();
      });
      if (!fullPath) return null;

      // Extract description.name: grep for "name: '...'" or "name: \"...\"" in the node file
      const grepExec = await container.exec({
        Cmd: ['sh', '-c', `grep -oE "name: *['\\\"][^'\\\"]+['\\\"]" "${fullPath}" 2>/dev/null | head -5`],
        AttachStdout: true,
        AttachStderr: true,
      });
      const grepStream = await grepExec.start({ hijack: true, stdin: false });
      const grepChunks: Buffer[] = [];
      const grepW = new Writable({
        write(chunk: Buffer | string, _: string, cb: (err?: Error) => void) {
          grepChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          cb();
        },
      });
      const grepOut = await new Promise<string>((res) => {
        docker.modem.demuxStream(grepStream, grepW, new Writable({ write(_: any, __: string, cb: () => void) { cb(); } }));
        grepStream.on('end', () => res(Buffer.concat(grepChunks).toString()));
        grepStream.on('error', () => res(''));
        grepStream.resume();
      });
      // First match like name: 'sendMail10Kcodeurs' (camelCase, not 'string' or 'options')
      const lines = grepOut.trim().split('\n').map((s) => s.replace(/name: *['"]|['"]$/g, '').trim()).filter(Boolean);
      const nodeName = lines.find((s) => /^[a-z][a-zA-Z0-9]*$/.test(s) && s !== 'string' && s !== 'options') || lines[0];
      if (!nodeName) return null;
      const resolved = `${packageName}.${nodeName}`;
      this.logger.log(`Resolved node type for ${packageName}: ${resolved}`);
      return resolved;
    } catch (err) {
      this.logger.warn(`Could not resolve node type for ${packageName}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
