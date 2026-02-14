import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface N8nConfig {
  n8nUiUrl: string;
  messageWebhookUrl: string | null;
}

interface MessageDeliverySettings {
  n8nApiKey?: string | null;
  [key: string]: unknown;
}

interface N8nWorkflowItem {
  id: string;
  name: string;
  active: boolean;
  webhookPaths: string[];
  productionWebhookUrls: string[];
}

interface N8nWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category?: 'content-analysis' | 'message-delivery' | 'data-processing' | 'other';
  workflowNamePattern?: string;
}

@Component({
  selector: 'app-n8n-flows',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, FormsModule],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">← Back to Dashboard</button>
          <div class="header-content">
            <h1>🔀 N8N Workflows</h1>
            <p class="subtitle">Configure API access, import templates, and manage workflows</p>
          </div>
        </div>

        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>

        <div *ngIf="error" class="error-state">
          <p>{{ error }}</p>
          <button class="retry-btn" (click)="load()">Retry</button>
        </div>

        <div *ngIf="!loading && !error && config" class="content">
          <!-- Tab Navigation -->
          <div class="tabs-nav">
            <button class="tab-btn" [class.active]="activeTab === 'config'" (click)="activeTab = 'config'">
              ⚙️ N8N Config
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'templates'" (click)="activeTab = 'templates'">
              📦 Import Templates
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'workflows'" (click)="activeTab = 'workflows'">
              📋 Workflows
            </button>
            <button class="tab-btn" [class.active]="activeTab === 'nodes'" (click)="activeTab = 'nodes'">
              🔌 N8N Nodes
            </button>
          </div>

          <!-- Tab Content: Config -->
          <div *ngIf="activeTab === 'config'" class="tab-content">
          <section class="section config-section">
            <h2 class="section-title">⚙️ Configuration</h2>
            <div class="config-item">
              <label class="config-label">N8N API Key</label>
              <p class="config-desc">Required to list and manage workflows. Create in N8N: Settings → API.</p>
              
              <!-- Current API Key Display -->
              <div *ngIf="apiKeySet && !showingChangeKey" class="api-key-current">
                <div class="api-key-status">
                  <span class="status-indicator" [class.valid]="!workflowsError && !workflowsLoading" [class.invalid]="workflowsError"></span>
                  <span *ngIf="!workflowsLoading && !workflowsError" class="status-text">Connected</span>
                  <span *ngIf="workflowsError" class="status-text error">Connection failed: {{ workflowsError }}</span>
                  <span *ngIf="workflowsLoading" class="status-text">Checking...</span>
                </div>
                <div class="api-key-display-row">
                  <code class="api-key-masked">{{ apiKeyMasked || '********' }}</code>
                  <button class="btn-sm" (click)="showingChangeKey = true">Change</button>
                </div>
              </div>

              <!-- No API Key Message -->
              <div *ngIf="!apiKeySet && !showingChangeKey && !loading" class="api-key-none">
                <p class="no-key-msg">No API key set. Paste your N8N API key below.</p>
              </div>

              <!-- API Key Input (for new or changing) -->
              <div *ngIf="(!apiKeySet || showingChangeKey) && !loading" class="api-key-input-section">
                <div class="api-key-row">
                  <input type="password" class="api-key-input" [placeholder]="apiKeySet ? 'Enter new API key' : 'Paste API key'" [(ngModel)]="n8nApiKeyInput" />
                  <button class="btn-primary" [disabled]="savingApiKey || !n8nApiKeyInput?.trim()" (click)="saveApiKey()">
                    {{ savingApiKey ? 'Saving…' : (apiKeySet ? 'Update' : 'Save') }}
                  </button>
                  <button *ngIf="apiKeySet && showingChangeKey" class="btn-secondary" (click)="cancelChangeKey()">Cancel</button>
                </div>
                <p *ngIf="apiKeySaveMessage" class="api-key-msg" [class.error]="apiKeySaveError">{{ apiKeySaveMessage }}</p>
              </div>
            </div>
            <div class="config-item">
              <label class="config-label">Open N8N</label>
              <p class="config-desc">Open the N8N UI to create or edit workflows manually.</p>
              <a [href]="config.n8nUiUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary">
                Open N8N →
              </a>
            </div>
          </section>
          </div>

          <!-- Tab Content: Import Templates -->
          <div *ngIf="activeTab === 'templates'" class="tab-content">
          <section class="section import-section">
            <h2 class="section-title">📦 Import Templates</h2>
            <p class="section-desc">Import workflow templates from the codebase or paste N8N workflow JSON to add to N8N.</p>
            <div *ngIf="unimportedTemplates.length > 0" class="scrollable-list templates-list">
              <div class="template-card" *ngFor="let t of unimportedTemplates">
                <div class="template-header">
                  <h3 class="template-name">{{ t.name }}</h3>
                  <span *ngIf="t.category" class="category-badge" [class]="'category-' + t.category">{{ getCategoryLabel(t.category) }}</span>
                </div>
                <p class="template-desc">{{ t.description }}</p>
                <div class="template-actions">
                  <button class="btn-sm btn-sm-primary" [disabled]="importingTemplate !== ''" (click)="importTemplate(t.id)">
                    {{ importingTemplate === t.id ? 'Importing…' : (findWorkflowForTemplate(t) ? 'Re-import' : 'Import') }}
                  </button>
                  <button class="btn-sm btn-sm-warn" (click)="removeTemplate(t)">
                    Remove
                  </button>
                </div>
              </div>
            </div>
            <div *ngIf="unimportedTemplates.length === 0" class="no-templates-msg">
              No workflow templates available. Use the button below to import from pasted JSON.
            </div>
            <div class="import-actions">
              <button type="button" class="btn-sm btn-sm-primary" (click)="openPasteJsonModal()">
                Paste JSON and import
              </button>
            </div>
            <p *ngIf="importTemplateError" class="error-msg">{{ importTemplateError }}</p>
            <p class="import-tip">Import one template at a time (button disables until the request finishes). If workflows duplicate or disappear after delete, refresh the page and delete/import again in N8N if needed. The <strong>Message email (Brevo)</strong> template uses Brevo’s API (replace <code>YOUR_BREVO_API_KEY_HERE</code> in the Send Email node). The SMTP template uses SMTP2GO; if you see &quot;Install this node&quot;, delete that workflow and re-import (it uses HTTP Request). After installing a community node, restart N8N for it to appear.</p>
          </section>
          </div>

          <!-- Tab Content: Workflows -->
          <div *ngIf="activeTab === 'workflows'" class="tab-content">
          <section class="section workflows-section">
            <h2 class="section-title">📋 Workflows</h2>
            <p class="section-desc">Workflows from your N8N instance.</p>
            <div *ngIf="workflowsError" class="workflows-error">
              <p>{{ workflowsError }}</p>
              <button class="retry-btn" (click)="loadWorkflows()">Retry</button>
            </div>
            <div *ngIf="workflowsLoading" class="workflows-loading">Loading workflows…</div>
            <div *ngIf="!workflowsLoading && !workflowsError && workflows.length === 0" class="workflows-empty">
              No workflows found. Import templates above or create workflows in N8N.
            </div>
            <div *ngIf="!workflowsLoading && !workflowsError && workflows.length > 0" class="scrollable-list workflows-list">
              <div class="workflow-card" *ngFor="let w of workflows">
                <div class="workflow-header">
                  <h3 class="workflow-name">{{ w.name }}</h3>
                  <span class="badge" [class.active]="w.active">{{ w.active ? 'Active' : 'Inactive' }}</span>
                </div>
                <div *ngIf="w.productionWebhookUrls.length > 0" class="workflow-webhooks">
                  <strong>Webhook URLs:</strong>
                  <ul class="webhook-urls">
                    <li *ngFor="let url of w.productionWebhookUrls"><code>{{ url }}</code></li>
                  </ul>
                </div>
                <!-- Purpose lozenges -->
                <div *ngIf="getWorkflowPurposes(w.id).length > 0" class="workflow-purposes">
                  <span class="purpose-lozenge" *ngFor="let p of getWorkflowPurposes(w.id)">
                    {{ p.displayName }}
                    <button type="button" class="purpose-remove" (click)="unassignPurpose(p.key)" title="Remove use case">×</button>
                  </span>
                </div>
                <div class="workflow-actions">
                  <a [href]="config!.n8nUiUrl + '/workflow/' + w.id" target="_blank" rel="noopener noreferrer" class="btn-sm">Open in N8N</a>
                  <button *ngIf="!w.active" class="btn-sm" (click)="setActive(w.id, true)">Activate</button>
                  <button *ngIf="w.active" class="btn-sm btn-sm-warn" (click)="setActive(w.id, false)">Deactivate</button>
                  <button *ngIf="w.productionWebhookUrls.length > 0" class="btn-sm" (click)="showPayloadFormat(w.id)">Payload Format</button>
                  <button *ngIf="w.productionWebhookUrls.length > 0" class="btn-sm btn-sm-primary" (click)="openPurposeModal(w)">
                    {{ getWorkflowPurposes(w.id).length > 0 ? 'Change use case' : 'Select use case' }}
                  </button>
                  <button type="button" class="btn-sm btn-sm-warn" [disabled]="deletingWorkflowId === w.id" (click)="deleteWorkflow(w.id, w.name)">
                    {{ deletingWorkflowId === w.id ? 'Deleting…' : 'Delete' }}
                  </button>
                </div>
              </div>
            </div>
          </section>
          </div>

          <!-- Tab Content: N8N Nodes -->
          <div *ngIf="activeTab === 'nodes'" class="tab-content">
          <section class="section community-nodes-section">
            <h2 class="section-title">🔌 N8N Nodes</h2>
            <p class="section-desc">Install custom N8N nodes to extend functionality. After installation, restart N8N for nodes to appear.</p>

            <!-- Installed Nodes List (top) -->
            <div class="installed-nodes">
              <h3 class="nodes-section-title">Installed Nodes</h3>
              <div *ngIf="installedNodesLoading" class="workflows-loading">Loading installed nodes…</div>
              <div *ngIf="!installedNodesLoading && installedNodes.length === 0" class="workflows-empty">
                No community nodes installed yet.
              </div>
              <div *ngIf="!installedNodesLoading && installedNodes.length > 0" class="installed-nodes-list">
                <div class="node-card" *ngFor="let node of installedNodes">
                  <div class="node-info">
                    <strong>{{ node.packageName }}</strong>
                    <span *ngIf="node.version" class="node-version">v{{ node.version }}</span>
                    <span *ngIf="node.needsRestart" class="restart-badge">⚠️ N8N restart needed</span>
                    <button *ngIf="node.needsRestart" type="button" class="dismiss-restart-btn" (click)="dismissRestartWarning(node.packageName)" title="Dismiss after you have restarted N8N">Dismiss</button>
                    <p *ngIf="node.description" class="node-desc">{{ node.description }}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Install Node Form -->
            <div class="install-node-form">
              <h3 class="nodes-section-title">Install by package name</h3>
              <div class="form-row">
                <input 
                  type="text" 
                  class="node-package-input" 
                  placeholder="e.g., n8n-nodes-sendmail"
                  [(ngModel)]="newNodePackageName"
                  (keyup.enter)="installNode()"
                />
                <button 
                  class="btn-primary" 
                  (click)="installNode()"
                  [disabled]="installingNode || !newNodePackageName.trim()"
                >
                  {{ installingNode ? 'Installing…' : (isNodeInstalled(newNodePackageName.trim()) ? 'Already installed' : 'Install Node') }}
                </button>
              </div>
              <p *ngIf="installNodeError" class="error-msg">{{ installNodeError }}</p>
              <p *ngIf="installNodeSuccess" class="api-key-msg">{{ installNodeSuccess }}</p>
              <div *ngIf="installNodeManualCommand" class="manual-command-box">
                <p class="manual-command-msg">{{ installNodeMessage || 'Run this command in your terminal (from the project root):' }}</p>
                <div class="manual-command-row">
                  <code class="manual-command-code">{{ installNodeManualCommand }}</code>
                  <button type="button" class="btn-sm btn-sm-primary" (click)="copyManualCommand()">
                    {{ manualCommandCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <p class="manual-command-then">Then restart N8N: <code>docker compose restart n8n</code></p>
              </div>
              <p class="node-install-note">
                <strong>Note:</strong> After installation, restart N8N container: <code>docker compose restart n8n</code>
              </p>
            </div>

            <!-- Popular Nodes + Search -->
            <div class="popular-nodes">
              <h3 class="nodes-section-title">Browse / search nodes</h3>
              <div class="search-box search-box-with-clear">
                <input 
                  type="text" 
                  class="node-package-input" 
                  placeholder="Search by name or package (Enter to search all npm)"
                  [(ngModel)]="nodeSearchQuery"
                  (keyup.enter)="searchNodesOnEnter()"
                  (ngModelChange)="onNodeSearchChange($event)"
                />
                <button
                  *ngIf="nodeSearchQuery || searchQueryForResults"
                  type="button"
                  class="search-clear-btn"
                  (click)="clearNodeSearch()"
                  title="Clear search"
                  aria-label="Clear search"
                >×</button>
                <p class="search-hint">Live filter below; press Enter to search all n8n nodes on npm.</p>
              </div>
              <div *ngIf="nodeSearchLoading" class="workflows-loading">Searching npm…</div>
              <p *ngIf="nodeSearchNotFound && searchQueryForResults" class="error-msg">No nodes found for "{{ searchQueryForResults }}".</p>
              <div *ngIf="popularNodesLoading" class="workflows-loading">Loading popular nodes…</div>
              <div *ngIf="popularNodesError" class="error-message">{{ popularNodesError }}</div>
              <div *ngIf="!popularNodesLoading && !popularNodesError && !nodeSearchLoading" class="popular-nodes-list">
                <div class="popular-node-item" *ngFor="let node of nodesToShow">
                  <div class="popular-node-info">
                    <strong>{{ node.name }}</strong>
                    <span class="popular-node-package">{{ node.package }}</span>
                    <p class="popular-node-desc">{{ node.description }}</p>
                  </div>
                  <button 
                    class="btn-sm btn-sm-primary"
                    (click)="installPopularNode(node.package)"
                    [disabled]="installingNode || isNodeInstalled(node.package)"
                  >
                    {{ isNodeInstalled(node.package) ? 'Installed' : 'Install' }}
                  </button>
                </div>
              </div>
            </div>
          </section>
          </div>
        </div>
      </div>

      <!-- Payload Format Modal -->
      <div *ngIf="showingPayloadFor" class="modal-overlay" (click)="showingPayloadFor = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Payload Format</h2>
            <button class="modal-close" (click)="showingPayloadFor = null">×</button>
          </div>
            <div class="modal-body">
            <p class="payload-desc">POST to the webhook URL with this JSON payload:</p>
            <pre class="payload-code">{{ payloadFormat }}</pre>
            <p class="payload-note">Fields marked with <code>// optional</code> can be omitted. The webhook expects a POST request with <code>Content-Type: application/json</code>.</p>
          </div>
        </div>
      </div>

      <!-- Paste JSON Import Modal -->
      <div *ngIf="pasteJsonModalOpen" class="modal-overlay" (click)="closePasteJsonModal()">
        <div class="modal-content paste-json-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Import workflow from JSON</h2>
            <button class="modal-close" (click)="closePasteJsonModal()">×</button>
          </div>
          <div class="modal-body">
            <p class="payload-desc">Paste N8N workflow JSON (e.g. from N8N export or a template file). It will be created in your N8N instance.</p>
            <textarea
              class="paste-json-textarea"
              [(ngModel)]="pastedWorkflowJson"
              placeholder='{"name":"My Workflow","nodes":[],"connections":{},...}'
              rows="14"
            ></textarea>
            <p *ngIf="pastedJsonError" class="error-msg">{{ pastedJsonError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn-sm" (click)="closePasteJsonModal()">Cancel</button>
              <button type="button" class="btn-primary" [disabled]="importingPastedJson || !pastedWorkflowJson.trim()" (click)="importFromPastedJson()">
                {{ importingPastedJson ? 'Importing…' : 'Import into N8N' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Purpose Assignment Modal -->
      <div *ngIf="purposeModalOpen" class="modal-overlay" (click)="closePurposeModal()">
        <div class="modal-content purpose-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Select use case</h2>
            <button class="modal-close" (click)="closePurposeModal()">×</button>
          </div>
          <div class="modal-body">
            <p class="purpose-modal-desc">Assign this workflow to a use case. The app will call its webhook for that purpose.</p>
            <p class="purpose-modal-workflow">Workflow: <strong>{{ purposeModalWorkflow?.name }}</strong></p>
            <div class="purpose-list">
              <div class="purpose-item" *ngFor="let p of availablePurposes"
                   [class.purpose-selected]="selectedPurposeKey === p.key"
                   (click)="selectedPurposeKey = p.key">
                <div class="purpose-item-header">
                  <strong>{{ p.displayName }}</strong>
                  <span *ngIf="purposeAssignments[p.key]" class="purpose-current-badge">
                    Currently: {{ purposeAssignments[p.key].workflowName || 'another workflow' }}
                  </span>
                </div>
                <p class="purpose-item-desc">{{ p.description }}</p>
              </div>
            </div>
            <div *ngIf="purposeAssignError" class="error-msg" style="margin-top: 0.75rem;">{{ purposeAssignError }}</div>
            <div class="modal-actions">
              <button type="button" class="btn-sm" (click)="closePurposeModal()">Cancel</button>
              <button type="button" class="btn-primary" [disabled]="!selectedPurposeKey || assigningPurpose" (click)="confirmAssignPurpose()">
                {{ assigningPurpose ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .page { min-height: 100vh; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 2rem; padding-top: 1rem; }
    .page-header { margin-bottom: 2rem; }
    .back-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #00d4ff; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin-bottom: 1rem; }
    .back-btn:hover { background: rgba(255,255,255,0.15); }
    .header-content h1 { font-size: 2rem; color: #fff; margin: 0 0 0.5rem 0; }
    .subtitle { color: rgba(255,255,255,0.7); margin: 0; font-size: 1rem; }
    .loading-state, .error-state { text-align: center; color: #fff; padding: 2rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #00d4ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .retry-btn { background: #00d4ff; color: #0f0f23; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin-top: 1rem; }
    .content { max-width: 900px; margin: 0 auto; }
    .tabs-nav { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid rgba(255,255,255,0.1); }
    .tab-btn { background: transparent; border: none; color: rgba(255,255,255,0.6); padding: 0.75rem 1.25rem; cursor: pointer; font-size: 0.95rem; font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .tab-btn:hover { color: rgba(255,255,255,0.9); }
    .tab-btn.active { color: #00d4ff; border-bottom-color: #00d4ff; }
    .tab-content { animation: fadeIn 0.2s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    .section { margin-bottom: 2.5rem; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1); }
    .section-title { font-size: 1.35rem; color: #00d4ff; margin: 0 0 0.75rem 0; font-weight: 600; }
    .section-desc { color: rgba(255,255,255,0.7); margin: 0 0 1rem 0; font-size: 0.95rem; }
    .config-item { margin-bottom: 1.5rem; }
    .config-item:last-child { margin-bottom: 0; }
    .config-label { display: block; color: #fff; font-weight: 500; margin-bottom: 0.35rem; font-size: 1rem; }
    .config-desc { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0 0 0.75rem 0; }
    .api-key-status { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .status-indicator { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.3); }
    .status-indicator.valid { background: #4ade80; }
    .status-indicator.invalid { background: #f87171; }
    .status-text { color: rgba(255,255,255,0.8); font-size: 0.9rem; }
    .status-text.error { color: #f87171; }
    .api-key-row { display: flex; gap: 0.75rem; align-items: center; }
    .api-key-input { flex: 1; max-width: 400px; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.95rem; }
    .api-key-input::placeholder { color: rgba(255,255,255,0.4); }
    .btn-primary { background: #00d4ff; color: #0f0f23; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { display: inline-block; background: rgba(255,255,255,0.1); color: #00d4ff; border: 1px solid rgba(255,255,255,0.2); padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 500; text-decoration: none; }
    .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .api-key-msg { font-size: 0.9rem; margin: 0.5rem 0 0 0; color: #4ade80; }
    .api-key-msg.error { color: #f87171; }
    .api-key-current { margin-bottom: 0.75rem; }
    .api-key-display-row { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
    .api-key-masked { background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.9rem; color: rgba(255,255,255,0.9); font-family: monospace; letter-spacing: 0.05em; }
    .api-key-input-section { margin-top: 0.5rem; }
    .api-key-none { margin-top: 0.5rem; }
    .no-key-msg { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0; }
    .scrollable-list { max-height: 500px; overflow-y: auto; padding-right: 0.5rem; }
    .scrollable-list::-webkit-scrollbar { width: 6px; }
    .scrollable-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 3px; }
    .scrollable-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
    .scrollable-list::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
    .template-card, .workflow-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .template-header, .workflow-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .template-name, .workflow-name { font-size: 1.1rem; color: #fff; margin: 0; font-weight: 500; }
    .template-desc { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0 0 0.75rem 0; line-height: 1.5; }
    .category-badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .category-message-delivery { background: rgba(74,222,128,0.2); color: #4ade80; }
    .category-content-analysis { background: rgba(0,212,255,0.2); color: #00d4ff; }
    .category-data-processing { background: rgba(168,85,247,0.2); color: #a855f7; }
    .category-other { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
    .template-actions, .workflow-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-sm { padding: 0.35rem 0.7rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: #fff; text-decoration: none; }
    .btn-sm:hover { background: rgba(255,255,255,0.15); }
    .btn-sm-primary { background: rgba(0,212,255,0.2); border-color: #00d4ff; color: #00d4ff; }
    .btn-sm-warn { background: rgba(248,113,113,0.2); border-color: #f87171; color: #f87171; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.15); font-size: 0.8rem; }
    .badge.active { background: rgba(74,222,128,0.3); color: #4ade80; }
    .workflow-webhooks { margin: 0.75rem 0; }
    .workflow-webhooks strong { color: rgba(255,255,255,0.9); font-size: 0.9rem; }
    .webhook-urls { list-style: none; padding: 0; margin: 0.5rem 0 0 0; }
    .webhook-urls li { margin-bottom: 0.35rem; }
    .webhook-urls code { background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem; color: #4ade80; word-break: break-all; display: block; }
    .workflows-error { color: #f87171; padding: 1rem; background: rgba(248,113,113,0.1); border-radius: 8px; margin-bottom: 1rem; }
    .workflows-loading, .workflows-empty { color: rgba(255,255,255,0.7); padding: 1rem; text-align: center; }
    .error-msg { color: #f87171; margin-top: 0.5rem; font-size: 0.9rem; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #1a1a2e; border-radius: 12px; padding: 0; max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.2); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .modal-header h2 { margin: 0; color: #00d4ff; font-size: 1.25rem; }
    .modal-close { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
    .modal-close:hover { color: #fff; }
    .modal-body { padding: 1.5rem; overflow-y: auto; }
    .payload-desc { color: rgba(255,255,255,0.8); margin: 0 0 1rem 0; }
    .payload-code { background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; overflow-x: auto; color: #4ade80; font-family: 'Courier New', monospace; font-size: 0.9rem; line-height: 1.5; margin: 0 0 1rem 0; }
    .payload-note { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0; }
    .install-node-form { margin-bottom: 2rem; }
    .form-row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; }
    .node-package-input { flex: 1; max-width: 500px; padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.95rem; }
    .node-package-input::placeholder { color: rgba(255,255,255,0.4); }
    .node-install-note { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0.5rem 0 0 0; }
    .node-install-note code { background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; color: #4ade80; }
    .popular-nodes, .installed-nodes { margin-top: 2rem; }
    .installed-nodes { margin-bottom: 2.5rem; }
    .subsection-title { font-size: 1rem; color: rgba(255,255,255,0.9); margin: 0 0 1rem 0; font-weight: 500; }
    .community-nodes-section .nodes-section-title { font-size: 1.2rem; color: #00d4ff; margin: 0 0 0.75rem 0; font-weight: 600; }
    .search-box { margin-bottom: 1rem; }
    .search-box-with-clear { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .search-box-with-clear .node-package-input { flex: 1; min-width: 200px; }
    .search-clear-btn { flex-shrink: 0; width: 2rem; height: 2rem; padding: 0; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.9); font-size: 1.25rem; line-height: 1; cursor: pointer; }
    .search-clear-btn:hover { background: rgba(255,255,255,0.2); }
    .search-hint { display: block; margin: 0.5rem 0 0 0; font-size: 0.8rem; color: rgba(255,255,255,0.65); line-height: 1.4; width: 100%; }
    .dismiss-restart-btn { margin-left: 0.5rem; padding: 0.2rem 0.5rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: transparent; color: rgba(255,255,255,0.8); cursor: pointer; }
    .dismiss-restart-btn:hover { background: rgba(255,255,255,0.1); }
    .popular-nodes-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .popular-node-item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; }
    .popular-node-info { flex: 1; }
    .popular-node-info strong { display: block; color: #fff; margin-bottom: 0.25rem; }
    .popular-node-package { display: block; color: rgba(255,255,255,0.5); font-size: 0.85rem; font-family: monospace; margin-bottom: 0.5rem; }
    .popular-node-desc { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0; }
    .installed-nodes-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .node-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; }
    .node-info strong { display: inline-block; color: #fff; margin-right: 0.5rem; }
    .node-version { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-left: 0.5rem; }
    .restart-badge { display: inline-block; background: rgba(251,191,36,0.2); color: #fbbf24; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; margin-left: 0.5rem; }
    .node-desc { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0.5rem 0 0 0; }
    .manual-command-box { margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(0,212,255,0.3); }
    .manual-command-msg { color: rgba(255,255,255,0.9); margin: 0 0 0.75rem 0; font-size: 0.95rem; }
    .manual-command-row { display: flex; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap; }
    .manual-command-code { flex: 1; min-width: 200px; display: block; padding: 0.75rem; background: rgba(0,0,0,0.4); border-radius: 6px; font-size: 0.85rem; color: #4ade80; word-break: break-all; }
    .manual-command-then { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0.75rem 0 0 0; }
    .manual-command-then code { background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; color: #4ade80; }
    .no-templates-msg { color: rgba(255,255,255,0.6); font-size: 0.95rem; margin: 0 0 1rem 0; }
    .import-actions { margin-top: 1rem; }
    .paste-json-modal .modal-content { max-width: 700px; }
    .paste-json-textarea { width: 100%; min-height: 280px; padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff; font-family: 'Courier New', monospace; font-size: 0.9rem; resize: vertical; box-sizing: border-box; }
    .paste-json-textarea::placeholder { color: rgba(255,255,255,0.4); }
    .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
    .import-tip { color: rgba(255,255,255,0.55); font-size: 0.85rem; margin: 1rem 0 0 0; line-height: 1.4; }
    .workflow-purposes { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    .purpose-lozenge { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(0,212,255,0.15); color: #00d4ff; border: 1px solid rgba(0,212,255,0.3); border-radius: 20px; padding: 0.3rem 0.75rem; font-size: 0.8rem; font-weight: 500; }
    .purpose-remove { background: none; border: none; color: rgba(0,212,255,0.7); font-size: 1rem; cursor: pointer; padding: 0; line-height: 1; }
    .purpose-remove:hover { color: #ff4444; }
    .purpose-modal .modal-content { max-width: 550px; }
    .purpose-modal-desc { color: rgba(255,255,255,0.7); margin: 0 0 0.5rem 0; font-size: 0.95rem; }
    .purpose-modal-workflow { color: rgba(255,255,255,0.9); margin: 0 0 1rem 0; font-size: 0.95rem; }
    .purpose-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .purpose-item { background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.75rem 1rem; cursor: pointer; transition: all 0.15s; }
    .purpose-item:hover { border-color: rgba(0,212,255,0.3); background: rgba(0,212,255,0.05); }
    .purpose-selected { border-color: #00d4ff !important; background: rgba(0,212,255,0.1) !important; }
    .purpose-item-header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .purpose-item-header strong { color: #fff; }
    .purpose-current-badge { font-size: 0.75rem; color: rgba(255,255,255,0.5); font-style: italic; }
    .purpose-item-desc { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0.25rem 0 0 0; }
  `],
})
export class N8nFlowsComponent implements OnInit {
  loading = true;
  error = '';
  config: N8nConfig | null = null;
  apiKeySet = false;
  apiKeyMasked = '';
  showingChangeKey = false;
  n8nApiKeyInput = '';
  savingApiKey = false;
  apiKeySaveMessage = '';
  apiKeySaveError = false;
  workflows: N8nWorkflowItem[] = [];
  workflowsLoading = false;
  workflowsError = '';
  deletingWorkflowId: string | null = null;
  templates: N8nWorkflowTemplate[] = [];
  importingTemplate = '';
  importTemplateError = '';
  pasteJsonModalOpen = false;
  pastedWorkflowJson = '';
  pastedJsonError = '';
  importingPastedJson = false;
  showingPayloadFor: string | null = null;
  payloadFormat: string = '';
  newNodePackageName = '';
  installingNode = false;
  installNodeError = '';
  installNodeSuccess = '';
  installNodeManualCommand = '';
  installNodeMessage = '';
  manualCommandCopied = false;
  installedNodes: Array<{ packageName: string; version?: string; description?: string; needsRestart?: boolean }> = [];
  installedNodesLoading = false;
  activeTab: 'config' | 'templates' | 'workflows' | 'nodes' = 'config';

  // Workflow purposes
  availablePurposes: Array<{ key: string; displayName: string; description: string }> = [];
  purposeAssignments: Record<string, { workflowId: string; webhookUrl: string; workflowName: string; assignedAt: string }> = {};
  purposeModalOpen = false;
  purposeModalWorkflow: N8nWorkflowItem | null = null;
  selectedPurposeKey: string | null = null;
  assigningPurpose = false;
  purposeAssignError = '';
  hiddenTemplates: Set<string> = new Set(); // Templates hidden via "Remove" (persisted in localStorage)
  popularNodes: Array<{ name: string; package: string; description: string; weeklyDownloads?: number }> = [];
  popularNodesLoading = false;
  popularNodesError = '';
  nodeSearchQuery = '';
  /** When set, we are in "search results" mode and stay there until user clears or clicks X. */
  searchQueryForResults: string | null = null;
  /** Results from "search all npm" (Enter key); empty means not searched yet or cleared. */
  searchResults: Array<{ name: string; package: string; description: string }> | null = null;
  nodeSearchLoading = false;
  nodeSearchNotFound = false;

  constructor(
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit() {
    // Load hidden templates from localStorage
    const stored = localStorage.getItem('n8n_hidden_templates');
    if (stored) {
      try {
        const hidden = JSON.parse(stored) as string[];
        this.hiddenTemplates = new Set(hidden);
      } catch (e) {
        console.warn('Failed to parse hidden templates from localStorage:', e);
      }
    }
    // Load persisted installed nodes (with needsRestart flags) from localStorage
    const persistedNodes = localStorage.getItem('n8n_installed_nodes');
    if (persistedNodes) {
      try {
        const nodes = JSON.parse(persistedNodes) as Array<{ packageName: string; version?: string; description?: string; needsRestart?: boolean }>;
        this.installedNodes = nodes;
      } catch (e) {
        console.warn('Failed to parse persisted installed nodes from localStorage:', e);
      }
    }
    this.load();
  }

  /** Live filter over popular list (when not showing search results). */
  get filteredPopularNodes(): Array<{ name: string; package: string; description: string; weeklyDownloads?: number }> {
    let filtered = this.popularNodes;
    if (this.nodeSearchQuery.trim()) {
      const query = this.nodeSearchQuery.toLowerCase().trim();
      filtered = this.popularNodes.filter((node) => 
        node.name.toLowerCase().includes(query) ||
        node.package.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
      );
    }
    return filtered.filter((node) => {
      const isInstalled = this.installedNodes.some((installed) => {
        return installed.packageName === node.package || 
               installed.packageName?.toLowerCase() === node.package?.toLowerCase();
      });
      return !isInstalled;
    });
  }

  /** List to show: search results (when user pressed Enter) or filtered popular nodes. Stays on search until clear. */
  get nodesToShow(): Array<{ name: string; package: string; description: string }> {
    if (this.searchQueryForResults !== null && this.searchResults !== null) {
      return this.searchResults.filter((node) => {
        const isInstalled = this.installedNodes.some((installed) =>
          installed.packageName?.toLowerCase() === node.package?.toLowerCase()
        );
        return !isInstalled;
      });
    }
    return this.filteredPopularNodes;
  }

  get unimportedTemplates(): N8nWorkflowTemplate[] {
    // Filter out templates that are already imported (match by workflowNamePattern or template name)
    // Also filter out hidden templates (removed by user)
    const importedNames = this.workflows.map((w) => w.name.toLowerCase());
    return this.templates.filter((t) => {
      // Skip hidden templates
      if (this.hiddenTemplates.has(t.id)) return false;
      // Check by workflowNamePattern first
      if (t.workflowNamePattern) {
        const patternLower = t.workflowNamePattern.toLowerCase();
        // Check if any workflow name contains the pattern (e.g. "Send message as email (SMTP)" matches "Upora – Send message as email (SMTP)")
        const isImported = importedNames.some((wn) => wn.includes(patternLower));
        if (isImported) return false;
      }
      // Also check by template-specific keywords
      // For SMTP template: look for workflows with "send message as email" and "smtp"
      if (t.id === 'upora-message-email-smtp') {
        const hasSmtpEmail = importedNames.some((wn) => 
          wn.includes('send message as email') && wn.includes('smtp')
        );
        if (hasSmtpEmail) return false;
      }
      // For SendMail template: look for workflows with "send message as email" and "sendmail"
      if (t.id === 'upora-message-email-sendmail') {
        const hasSendmail = importedNames.some((wn) => 
          wn.includes('send message as email') && (wn.includes('sendmail') || wn.includes('send mail'))
        );
        if (hasSendmail) return false;
      }
      // For Google Sheets test template: look for workflows with "test google sheets"
      if (t.id === 'upora-test-google-sheets') {
        const hasGoogleSheets = importedNames.some((wn) => 
          wn.toLowerCase().includes('test google sheets') || wn.toLowerCase().includes('google sheets')
        );
        if (hasGoogleSheets) return false;
      }
      // For SendGrid template: look for workflows with "send message as email" but NOT "smtp", "brevo", or "sendmail"
      if (t.id === 'upora-message-email') {
        const hasEmailNotOthers = importedNames.some((wn) => {
          const hasEmail = wn.includes('send message as email');
          const hasSmtp = wn.includes('smtp') || wn.includes('smtp2go');
          const hasBrevo = wn.includes('brevo');
          const hasSendmail = wn.includes('sendmail') || wn.includes('send mail');
          return hasEmail && !hasSmtp && !hasBrevo && !hasSendmail;
        });
        if (hasEmailNotOthers) return false;
      }
      // Fallback: check by template name keywords
      const templateKeywords = t.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== 'email' && w !== 'message');
      if (templateKeywords.length > 0) {
        const hasKeywords = importedNames.some((wn) => templateKeywords.every((kw) => wn.includes(kw)));
        if (hasKeywords) return false;
      }
      return true;
    });
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'message-delivery': 'Message Delivery',
      'content-analysis': 'Content Analysis',
      'data-processing': 'Data Processing',
      'other': 'Other',
    };
    return labels[category] || category;
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<N8nConfig>('/super-admin/n8n-config').subscribe({
      next: (c) => {
        this.config = c;
        this.loading = false;
        this.loadSettings();
        this.loadTemplates();
        this.loadWorkflows();
        this.loadInstalledNodes();
        this.loadPopularNodes();
        this.loadPurposes();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load N8N config';
        this.loading = false;
      },
    });
  }

  loadSettings() {
    this.api.get<MessageDeliverySettings>('/super-admin/message-delivery-settings').subscribe({
      next: (s) => {
        const keyValue = s.n8nApiKey ? String(s.n8nApiKey).trim() : '';
        // Backend returns '********' when a key is set (masked), or the actual key, or null/empty if not set
        const hasKey = keyValue !== '' && keyValue !== null;
        this.apiKeySet = hasKey;
        this.apiKeyMasked = hasKey ? '********' : '';
      },
      error: () => {},
    });
  }

  cancelChangeKey() {
    this.showingChangeKey = false;
    this.n8nApiKeyInput = '';
    this.apiKeySaveMessage = '';
    this.apiKeySaveError = false;
  }

  loadTemplates() {
    this.api.get<N8nWorkflowTemplate[]>('/super-admin/n8n/workflow-templates').subscribe({
      next: (list) => {
        this.templates = Array.isArray(list) ? list : [];
      },
      error: () => {},
    });
  }

  loadWorkflows() {
    this.workflowsError = '';
    this.workflowsLoading = true;
    this.api.get<N8nWorkflowItem[]>('/super-admin/n8n/workflows').subscribe({
      next: (list) => {
        this.workflows = Array.isArray(list) ? list : [];
        this.workflowsLoading = false;
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.workflowsError = Array.isArray(msg) ? (msg[0] || '') : (msg || err?.message || 'Failed to load workflows. Set the N8N API key above.');
        this.workflowsLoading = false;
      },
    });
  }

  saveApiKey() {
    const key = (this.n8nApiKeyInput || '').trim();
    if (!key && !this.apiKeySet) {
      this.apiKeySaveMessage = 'Enter an API key.';
      this.apiKeySaveError = true;
      return;
    }
    this.savingApiKey = true;
    this.apiKeySaveMessage = '';
    this.apiKeySaveError = false;
    this.api.patch<MessageDeliverySettings>('/super-admin/message-delivery-settings', { n8nApiKey: key || undefined }).subscribe({
      next: () => {
        this.savingApiKey = false;
        this.apiKeySaveMessage = key ? 'API key updated.' : 'API key cleared.';
        this.apiKeySet = !!key;
        this.apiKeyMasked = key ? '********' : '';
        this.showingChangeKey = false;
        this.n8nApiKeyInput = '';
        this.loadWorkflows();
      },
      error: (err) => {
        this.savingApiKey = false;
        this.apiKeySaveMessage = err?.error?.message || err?.message || 'Failed to save API key.';
        this.apiKeySaveError = true;
      },
    });
  }

  setActive(id: string, active: boolean) {
    const path = active ? `/super-admin/n8n/workflows/${id}/activate` : `/super-admin/n8n/workflows/${id}/deactivate`;
    this.api.post<unknown>(path, {}).subscribe({
      next: () => this.loadWorkflows(),
      error: (err) => {
        this.workflowsError = err?.error?.message || err?.message || (active ? 'Failed to activate' : 'Failed to deactivate');
      },
    });
  }

  // ── Workflow purposes ──────────────────────────────────────────────────

  loadPurposes() {
    this.api.get<{ purposes: Array<{ key: string; displayName: string; description: string }>; assignments: Record<string, any> }>('/super-admin/n8n/workflow-purposes').subscribe({
      next: (res) => {
        this.availablePurposes = res.purposes || [];
        this.purposeAssignments = res.assignments || {};
      },
      error: () => {},
    });
  }

  /** Get purpose display names for a specific workflow. */
  getWorkflowPurposes(workflowId: string): Array<{ key: string; displayName: string }> {
    const results: Array<{ key: string; displayName: string }> = [];
    for (const [key, assignment] of Object.entries(this.purposeAssignments)) {
      if (assignment.workflowId === workflowId) {
        const purpose = this.availablePurposes.find((p) => p.key === key);
        results.push({ key, displayName: purpose?.displayName || key });
      }
    }
    return results;
  }

  openPurposeModal(workflow: N8nWorkflowItem) {
    this.purposeModalWorkflow = workflow;
    this.purposeModalOpen = true;
    this.selectedPurposeKey = null;
    this.purposeAssignError = '';
    this.assigningPurpose = false;
    // Pre-select if this workflow is already assigned to a purpose
    for (const [key, assignment] of Object.entries(this.purposeAssignments)) {
      if (assignment.workflowId === workflow.id) {
        this.selectedPurposeKey = key;
        break;
      }
    }
  }

  closePurposeModal() {
    this.purposeModalOpen = false;
    this.purposeModalWorkflow = null;
  }

  confirmAssignPurpose() {
    if (!this.selectedPurposeKey || !this.purposeModalWorkflow) return;
    const wf = this.purposeModalWorkflow;
    const webhookUrl = wf.productionWebhookUrls?.[0] || '';
    if (!webhookUrl) {
      this.purposeAssignError = 'This workflow has no production webhook URL. Activate the workflow first.';
      return;
    }
    this.assigningPurpose = true;
    this.purposeAssignError = '';
    this.api.post<{ ok: boolean; assignments: Record<string, any> }>('/super-admin/n8n/workflow-purposes/assign', {
      purposeKey: this.selectedPurposeKey,
      workflowId: wf.id,
      webhookUrl,
      workflowName: wf.name,
    }).subscribe({
      next: (res) => {
        this.assigningPurpose = false;
        this.purposeAssignments = res.assignments || {};
        this.closePurposeModal();
      },
      error: (err) => {
        this.assigningPurpose = false;
        this.purposeAssignError = err?.error?.message || err?.message || 'Failed to save';
      },
    });
  }

  unassignPurpose(purposeKey: string) {
    this.api.post<{ ok: boolean; assignments: Record<string, any> }>('/super-admin/n8n/workflow-purposes/unassign', { purposeKey }).subscribe({
      next: (res) => {
        this.purposeAssignments = res.assignments || {};
      },
      error: () => {},
    });
  }

  deleteWorkflow(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) {
      return;
    }
    this.deletingWorkflowId = id;
    this.workflowsError = '';
    this.api.delete(`/super-admin/n8n/workflows/${id}`).subscribe({
      next: () => {
        this.deletingWorkflowId = null;
        this.loadWorkflows();
      },
      error: (err) => {
        this.deletingWorkflowId = null;
        const msg = err?.error?.message ?? err?.message ?? '';
        if (err?.status === 404 || (msg && msg.toLowerCase().includes('not found'))) {
          this.workflowsError = 'Workflow not found (may already be deleted in N8N). Refresh the list.';
          this.loadWorkflows();
        } else {
          this.workflowsError = msg || 'Failed to delete workflow';
        }
      },
    });
  }

  importTemplate(templateId: string) {
    this.importTemplateError = '';
    this.importingTemplate = templateId;
    this.api.post<N8nWorkflowItem>('/super-admin/n8n/workflows/import', { template: templateId }).subscribe({
      next: () => {
        this.importingTemplate = '';
        this.importTemplateError = '';
        // Reload workflows so the template disappears from the unimported list
        this.loadWorkflows();
      },
      error: (err) => {
        this.importingTemplate = '';
        const msg = err?.error?.message;
        this.importTemplateError = Array.isArray(msg) ? (msg[0] || 'Import failed.') : (msg || err?.message || 'Import failed.');
      },
    });
  }

  showPayloadFormat(workflowId: string) {
    this.api.get<any>(`/super-admin/n8n/workflows/${workflowId}`).subscribe({
      next: (workflow) => {
        // Extract payload format from workflow nodes
        const payload = this.extractPayloadFormat(workflow);
        this.payloadFormat = JSON.stringify(payload, null, 2);
        this.showingPayloadFor = workflowId;
      },
      error: () => {
        // Fallback: show generic message email payload
        this.payloadFormat = JSON.stringify({
          toUserEmail: 'user@example.com',
          title: 'Email subject',
          body: 'Email body text',
          fromAddress: 'noreply@yourdomain.com', // optional
        }, null, 2);
        this.showingPayloadFor = workflowId;
      },
    });
  }

  extractPayloadFormat(workflow: any): Record<string, unknown> {
    // Look for Send Email node to infer payload format
    const sendEmailNode = workflow.nodes?.find((n: any) => 
      n.type === 'n8n-nodes-base.sendemail' || n.name?.toLowerCase().includes('send email')
    );
    if (sendEmailNode?.parameters) {
      const params = sendEmailNode.parameters;
      const payload: Record<string, unknown> = {};
      // Extract fields from expressions like "={{ $json.fieldName }}" or "={{ $json.fieldName || 'default' }}"
      if (params.toEmail) {
        const match = String(params.toEmail).match(/\$json\.(\w+)/);
        if (match) payload[match[1]] = 'user@example.com';
        else payload['toEmail'] = 'user@example.com';
      }
      if (params.subject) {
        const match = String(params.subject).match(/\$json\.(\w+)/);
        if (match) payload[match[1]] = 'Email subject';
        else payload['subject'] = 'Email subject';
      }
      if (params.message) {
        const match = String(params.message).match(/\$json\.(\w+)/);
        if (match) payload[match[1]] = 'Email body text';
        else payload['message'] = 'Email body text';
      }
      if (params.fromEmail) {
        const match = String(params.fromEmail).match(/\$json\.(\w+)/);
        if (match) {
          // Check if there's a fallback (indicates optional)
          const hasFallback = String(params.fromEmail).includes('||');
          payload[hasFallback ? match[1] + ' (optional)' : match[1]] = 'noreply@yourdomain.com';
        }
      }
      if (Object.keys(payload).length > 0) return payload;
    }
    // Default: message email payload format (from upora-message-email-smtp.json)
    return {
      toUserEmail: 'user@example.com',
      title: 'Email subject',
      body: 'Email body text',
      'fromAddress (optional)': 'noreply@yourdomain.com',
    };
  }

  onNodeSearchChange(value: string) {
    if (value.trim() === '') {
      this.searchResults = null;
      this.searchQueryForResults = null;
      this.nodeSearchNotFound = false;
    }
  }

  /** Clear search: leave "search results" mode and show popular list again. */
  clearNodeSearch() {
    this.nodeSearchQuery = '';
    this.searchQueryForResults = null;
    this.searchResults = null;
    this.nodeSearchNotFound = false;
  }

  /** Called on Enter in search box: search all n8n community nodes on npm. Stays on result until clear. */
  searchNodesOnEnter() {
    const q = this.nodeSearchQuery.trim();
    if (!q) {
      this.clearNodeSearch();
      return;
    }
    this.searchQueryForResults = q;
    this.nodeSearchLoading = true;
    this.nodeSearchNotFound = false;
    this.api.get<Array<{ name: string; package: string; description: string }>>('/super-admin/n8n/community-nodes/search', { q }).subscribe({
      next: (nodes) => {
        this.nodeSearchLoading = false;
        this.searchResults = Array.isArray(nodes) ? nodes : [];
        this.nodeSearchNotFound = this.searchResults.length === 0;
      },
      error: () => {
        this.nodeSearchLoading = false;
        this.searchResults = [];
        this.nodeSearchNotFound = true;
      },
    });
  }

  loadPopularNodes() {
    this.popularNodesLoading = true;
    this.popularNodesError = '';
    this.api.get<Array<{ name: string; package: string; description: string; weeklyDownloads?: number }>>('/super-admin/n8n/community-nodes/popular').subscribe({
      next: (nodes) => {
        this.popularNodes = Array.isArray(nodes) ? nodes : [];
        this.popularNodesLoading = false;
      },
      error: (err) => {
        console.error('[N8N] Failed to load popular nodes:', err);
        this.popularNodesError = err?.error?.message || err?.message || 'Failed to load popular nodes';
        // Fallback to default nodes
        this.popularNodes = [
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
        ];
        this.popularNodesLoading = false;
      },
    });
  }

  loadInstalledNodes() {
    this.installedNodesLoading = true;
    this.api.get<Array<{ packageName: string; version?: string; description?: string }>>('/super-admin/n8n/community-nodes').subscribe({
      next: (nodes) => {
        const fromServer = Array.isArray(nodes) ? nodes : [];
        console.log('[N8N] Server returned nodes:', fromServer.map((n) => n.packageName));
        console.log('[N8N] Current installedNodes (before merge):', this.installedNodes.map((n) => ({ pkg: n.packageName, needsRestart: n.needsRestart })));
        
        // Create a map of server nodes by package name for quick lookup (case-insensitive)
        const serverNodeMap = new Map<string, { packageName: string; version?: string; description?: string; needsRestart: boolean }>();
        fromServer.forEach((n) => {
          const key = n.packageName.toLowerCase();
          serverNodeMap.set(key, { ...n, needsRestart: false });
        });
        
        // Merge: For each node we know about (from localStorage or optimistic), check if server found it
        const mergedNodes = this.installedNodes.map((existing) => {
          const key = existing.packageName.toLowerCase();
          const serverNode = serverNodeMap.get(key);
          if (serverNode) {
            // Server found it - use server's details but preserve needsRestart (don't clear on load;
            // package in node_modules doesn't mean N8N has been restarted)
            const keepRestart = existing.needsRestart === true;
            console.log(`[N8N] Server found ${existing.packageName}, needsRestart=${keepRestart}`);
            return { ...serverNode, needsRestart: keepRestart };
          }
          // Server didn't find it - keep existing entry (preserves needsRestart flag if set)
          console.log(`[N8N] Server did NOT find ${existing.packageName}, keeping entry`);
          return existing;
        });
        
        // Add any new nodes from server that we didn't know about (case-insensitive check)
        const existingPackageNames = new Set(this.installedNodes.map((n) => n.packageName.toLowerCase()));
        const newServerNodes = fromServer
          .filter((n) => !existingPackageNames.has(n.packageName.toLowerCase()))
          .map((n) => ({ ...n, needsRestart: false }));
        
        this.installedNodes = [...mergedNodes, ...newServerNodes];
        console.log('[N8N] Final installedNodes (after merge):', this.installedNodes.map((n) => ({ pkg: n.packageName, needsRestart: n.needsRestart })));
        // Persist to localStorage so they survive page refresh
        localStorage.setItem('n8n_installed_nodes', JSON.stringify(this.installedNodes));
        this.installedNodesLoading = false;
      },
      error: (err) => {
        console.error('[N8N] Failed to load installed nodes:', err);
        console.error('[N8N] Error details:', err?.error || err?.message);
        // On error, keep optimistic entries (don't clear them)
        // Persist current state even on error
        localStorage.setItem('n8n_installed_nodes', JSON.stringify(this.installedNodes));
        this.installedNodesLoading = false;
      },
    });
  }

  /** Dismiss "N8N restart needed" for a node (e.g. after user has restarted N8N). */
  dismissRestartWarning(packageName: string) {
    this.installedNodes = this.installedNodes.map((n) =>
      n.packageName.toLowerCase() === packageName.toLowerCase() ? { ...n, needsRestart: false } : n
    );
    localStorage.setItem('n8n_installed_nodes', JSON.stringify(this.installedNodes));
  }

  installNode() {
    const packageName = this.newNodePackageName.trim();
    if (!packageName) return;

    // If already in installed list, show message and do not call API (avoids redundant npm install)
    if (this.isNodeInstalled(packageName)) {
      this.installNodeError = '';
      this.installNodeSuccess = 'Same version of this node is already installed. Restart N8N if you have not yet.';
      return;
    }

    this.installingNode = true;
    this.installNodeError = '';
    this.installNodeSuccess = '';
    this.installNodeManualCommand = '';
    this.installNodeMessage = '';
    this.manualCommandCopied = false;

    this.api.post<{ success: boolean; message: string; alreadyInstalled?: boolean; output?: string; error?: string; manualCommand?: string }>(
      '/super-admin/n8n/community-nodes/install',
      { packageName },
    ).subscribe({
      next: (result) => {
        this.installingNode = false;
        if (result.success) {
          this.installNodeSuccess = result.message || `Successfully installed ${packageName}. Restart N8N for the node to appear.`;
          this.newNodePackageName = '';
          const existingIdx = this.installedNodes.findIndex((n) => n.packageName.toLowerCase() === packageName.toLowerCase());
          const setNeedsRestart = !result.alreadyInstalled;
          if (existingIdx === -1) {
            this.installedNodes = [...this.installedNodes, { packageName, needsRestart: setNeedsRestart }];
          } else {
            this.installedNodes = this.installedNodes.map((n, i) =>
              i === existingIdx ? { ...n, needsRestart: setNeedsRestart } : n
            );
          }
          localStorage.setItem('n8n_installed_nodes', JSON.stringify(this.installedNodes));
          if (!result.alreadyInstalled) setTimeout(() => this.loadInstalledNodes(), 2000);
        } else if (result.manualCommand) {
          this.installNodeManualCommand = result.manualCommand;
          this.installNodeMessage = result.message || 'Docker is not available from the backend. Run the command below in your terminal.';
          this.installNodeError = result.error || '';
        } else {
          const errorMsg = result.error || result.message || 'Installation failed. Check N8N logs.';
          this.installNodeError = errorMsg;
          if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
            this.installNodeError = `Package not found: ${packageName}. This package may not exist on npm, or it might be a built-in n8n node (like Google Sheets) that doesn't need to be installed.`;
          }
        }
      },
      error: (err) => {
        this.installingNode = false;
        const msg = err?.error?.message || err?.message || 'Failed to install node';
        this.installNodeError = msg;
      },
    });
  }

  copyManualCommand() {
    if (!this.installNodeManualCommand) return;
    navigator.clipboard.writeText(this.installNodeManualCommand).then(() => {
      this.manualCommandCopied = true;
      setTimeout(() => (this.manualCommandCopied = false), 2000);
    });
  }

  openPasteJsonModal() {
    this.pasteJsonModalOpen = true;
    this.pastedWorkflowJson = '';
    this.pastedJsonError = '';
  }

  closePasteJsonModal() {
    this.pasteJsonModalOpen = false;
    this.pastedWorkflowJson = '';
    this.pastedJsonError = '';
  }

  importFromPastedJson() {
    const json = this.pastedWorkflowJson.trim();
    if (!json) return;

    this.importingPastedJson = true;
    this.pastedJsonError = '';

    this.api.post<{ id: string; name: string }>('/super-admin/n8n/workflows/import-json', { json }).subscribe({
      next: () => {
        this.importingPastedJson = false;
        this.closePasteJsonModal();
        this.loadWorkflows();
      },
      error: (err) => {
        this.importingPastedJson = false;
        this.pastedJsonError = err?.error?.message || err?.message || 'Import failed';
      },
    });
  }

  installPopularNode(packageName: string) {
    this.newNodePackageName = packageName;
    this.installNode();
  }

  isNodeInstalled(packageName: string): boolean {
    return this.installedNodes.some((n) => n.packageName === packageName);
  }


  /**
   * Find the workflow ID that matches a template (for delete).
   */
  findWorkflowForTemplate(template: N8nWorkflowTemplate): N8nWorkflowItem | null {
    const importedNames = this.workflows.map((w) => ({ id: w.id, name: w.name.toLowerCase() }));
    // Check by workflowNamePattern first (most reliable)
    if (template.workflowNamePattern) {
      const patternLower = template.workflowNamePattern.toLowerCase();
      // Remove "Upora – " prefix if present in workflow names
      const normalizedPattern = patternLower.replace(/^upora\s*[–-]\s*/i, '');
      const match = importedNames.find((wn) => {
        const normalizedName = wn.name.replace(/^upora\s*[–-]\s*/i, '');
        return normalizedName.includes(normalizedPattern) || wn.name.includes(patternLower);
      });
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    // Template-specific matching (fallback)
    if (template.id === 'upora-message-email-smtp') {
      // Look for workflows with "send message as email" AND ("smtp" OR "smtp2go")
      const match = importedNames.find((wn) => {
        const hasEmail = wn.name.includes('send message as email');
        const hasSmtp = wn.name.includes('smtp') || wn.name.includes('smtp2go');
        return hasEmail && hasSmtp;
      });
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    if (template.id === 'upora-message-email-brevo') {
      const match = importedNames.find((wn) => wn.name.includes('send message as email') && wn.name.includes('brevo'));
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    if (template.id === 'upora-message-email-sendmail') {
      const match = importedNames.find((wn) => wn.name.includes('send message as email') && (wn.name.includes('sendmail') || wn.name.includes('send mail')));
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    if (template.id === 'upora-test-google-sheets') {
      const match = importedNames.find((wn) => wn.name.toLowerCase().includes('test google sheets') || wn.name.toLowerCase().includes('google sheets'));
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    if (template.id === 'upora-message-email') {
      const match = importedNames.find((wn) => {
        const hasEmail = wn.name.includes('send message as email');
        const hasSmtp = wn.name.includes('smtp') || wn.name.includes('smtp2go');
        const hasBrevo = wn.name.includes('brevo');
        const hasSendmail = wn.name.includes('sendmail') || wn.name.includes('send mail');
        return hasEmail && !hasSmtp && !hasBrevo && !hasSendmail;
      });
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    // Fallback: check by template name keywords
    const templateKeywords = template.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== 'email' && w !== 'message');
    if (templateKeywords.length > 0) {
      const match = importedNames.find((wn) => templateKeywords.every((kw) => wn.name.includes(kw)));
      if (match) return this.workflows.find((w) => w.id === match.id) || null;
    }
    return null;
  }

  /**
   * Remove (hide) a template from the list permanently.
   * Templates are stored in Upora/n8n/workflows/*.json files.
   */
  removeTemplate(template: N8nWorkflowTemplate) {
    const isImported = this.findWorkflowForTemplate(template) !== null;
    const message = isImported
      ? `Remove "${template.name}" from the templates list? The workflow will remain in N8N, but this template will no longer appear here.`
      : `Remove "${template.name}" from the templates list? This template will no longer appear here.`;
    
    if (confirm(message)) {
      this.hiddenTemplates.add(template.id);
      // Persist to localStorage so it survives page refresh
      localStorage.setItem('n8n_hidden_templates', JSON.stringify(Array.from(this.hiddenTemplates)));
    }
  }


  goBack() {
    this.router.navigate(['/super-admin']);
  }
}
