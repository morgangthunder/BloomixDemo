import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

interface AIAssistant {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompts: {
    [key: string]: {
      label: string;
      content: string;
      placeholder: string;
    };
  };
}

@Component({
  selector: 'app-ai-prompts',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="ai-prompts-page">
        <!-- Header -->
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">
            ← Back to Dashboard
          </button>
          <h1>🧠 AI Assistant Prompts</h1>
          <p class="subtitle">Configure prompts for each AI assistant</p>
        </div>

        <!-- Assistant Selection -->
        <div *ngIf="!selectedAssistant" class="assistants-grid">
          <div *ngFor="let assistant of assistants" 
               class="assistant-card" 
               (click)="selectAssistant(assistant)">
            <div class="assistant-icon">{{ assistant.icon }}</div>
            <div class="assistant-info">
              <h3>{{ assistant.name }}</h3>
              <p>{{ assistant.description }}</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>

        <!-- Prompt Editor -->
        <div *ngIf="selectedAssistant" class="prompt-editor">
          <div class="editor-header">
            <div class="assistant-title">
              <span class="assistant-icon-large">{{ selectedAssistant.icon }}</span>
              <div>
                <h2>{{ selectedAssistant.name }}</h2>
                <p>{{ selectedAssistant.description }}</p>
              </div>
            </div>
          </div>

          <div class="prompts-container">
            <div *ngFor="let promptKey of getPromptKeys(selectedAssistant)" class="prompt-section">
              <label class="prompt-label">
                {{ selectedAssistant.prompts[promptKey].label }}
              </label>
              <textarea
                [(ngModel)]="selectedAssistant.prompts[promptKey].content"
                [placeholder]="selectedAssistant.prompts[promptKey].placeholder"
                class="prompt-textarea"
                rows="8"
              ></textarea>
              <div class="prompt-footer">
                <div class="char-count">
                  {{ selectedAssistant.prompts[promptKey].content.length }} characters
                </div>
                <div class="prompt-actions">
                  <button 
                    class="btn-cancel-small" 
                    (click)="resetPrompt(selectedAssistant, promptKey)"
                    [disabled]="savingPrompt === promptKey || !hasPromptChanged(selectedAssistant, promptKey)"
                    title="Reset to last saved version">
                    Cancel
                  </button>
                  <button 
                    class="btn-save-small" 
                    (click)="saveIndividualPrompt(selectedAssistant, promptKey)"
                    [disabled]="savingPrompt === promptKey || !hasPromptChanged(selectedAssistant, promptKey)">
                    {{ savingPrompt === promptKey ? 'Saving...' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="editor-actions">
            <button class="btn-secondary" (click)="cancelEdit()">← Back to Assistants</button>
            <button class="btn-warning" (click)="resetToLatestDefaults()" [disabled]="savingAll">
              🔄 Reset to Latest Defaults
            </button>
            <button class="btn-primary" (click)="saveAllPrompts()" [disabled]="savingAll || !hasAnyPromptChanged()">
              {{ savingAll ? 'Saving All...' : 'Save All Changes' }}
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ai-prompts-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      margin-bottom: 1rem;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #00d4ff;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.5rem 0;
    }

    .subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    /* Assistants Grid */
    .assistants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      max-width: 1200px;
    }

    .assistant-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .assistant-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #00d4ff;
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
    }

    .assistant-icon {
      font-size: 3rem;
      flex-shrink: 0;
    }

    .assistant-info {
      flex: 1;
    }

    .assistant-info h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .assistant-info p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      line-height: 1.4;
    }

    .card-arrow {
      font-size: 1.5rem;
      color: #00d4ff;
      flex-shrink: 0;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;
    }

    .assistant-card:hover .card-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    /* Prompt Editor */
    .prompt-editor {
      max-width: 1200px;
    }

    .editor-header {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .assistant-title {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .assistant-icon-large {
      font-size: 4rem;
    }

    .assistant-title h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .assistant-title p {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .prompts-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .prompt-section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
    }

    .prompt-label {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      color: #00d4ff;
      margin-bottom: 1rem;
    }

    .prompt-textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      color: #ffffff;
      font-size: 0.875rem;
      font-family: 'Courier New', monospace;
      line-height: 1.6;
      resize: vertical;
      min-height: 150px;
    }

    .prompt-textarea:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
    }

    .prompt-textarea::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .prompt-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      gap: 1rem;
    }

    .char-count {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .prompt-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-save-small,
    .btn-cancel-small {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save-small {
      background: #10b981;
      color: white;
    }

    .btn-save-small:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-save-small:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel-small {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-cancel-small:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-cancel-small:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 2rem 0;
    }

    .btn-secondary, .btn-primary {
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-primary {
      background: #00d4ff;
      border: none;
      color: #0f0f23;
    }

    .btn-primary:hover:not(:disabled) {
      background: #00bce6;
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border: none;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 1rem;
    }

    .btn-warning:hover:not(:disabled) {
      background: linear-gradient(135deg, #e68900 0%, #c26505 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .btn-warning:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .ai-prompts-page {
        padding: 1rem;
      }

      .assistants-grid {
        grid-template-columns: 1fr;
      }

      .assistant-card {
        padding: 1.5rem;
      }

      .editor-header, .prompt-section {
        padding: 1.5rem;
      }

      .assistant-title {
        flex-direction: column;
        align-items: flex-start;
      }

      .editor-actions {
        flex-direction: column;
      }

      .btn-secondary, .btn-primary {
        width: 100%;
      }
    }
  `]
})
export class AiPromptsComponent implements OnInit {
  selectedAssistant: AIAssistant | null = null;
  assistants: AIAssistant[] = [
    {
      id: 'auto-populator',
      name: 'Auto-Populator',
      icon: '✨',
      description: 'Automatically generates titles, summaries, and topics when adding content sources (PDF, URL, text, image)',
      prompts: {
        textAutoPopulate: {
          label: 'Text Content Auto-Populate Prompt',
          content: 'You are helping a user create educational content from raw text. Analyze the text and generate a concise title, summary, and relevant topics.\n\nGiven the text content, generate:\n1. **Title**: A clear, descriptive title (max 100 characters)\n2. **Summary**: A 2-3 sentence summary of the main points\n3. **Topics**: Maximum 4 relevant topic tags\n\nGuidelines:\n- Title should be informative and engaging\n- Summary should capture the essence without jargon\n- Topics should be general categories (e.g., "Science", "Biology", "Cells") not overly specific\n- Maximum 4 topics\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3", "topic4"]\n}',
          placeholder: 'Enter the prompt for auto-populating text content fields...'
        },
        pdfAutoPopulate: {
          label: 'PDF Auto-Populate Prompt',
          content: 'You are helping a user catalog a PDF document. Analyze the extracted text and generate metadata.\n\nGiven the PDF content, generate:\n1. **Title**: Document title based on content (max 100 characters)\n2. **Summary**: Brief overview of the document\'s purpose\n3. **Topics**: 3-5 subject categories\n\nConsider:\n- Academic papers: Extract actual title if present\n- Textbooks: Use chapter/section name\n- Reports: Summarize main findings\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating PDF fields...'
        },
        urlAutoPopulate: {
          label: 'URL/Webpage Auto-Populate Prompt',
          content: 'You are helping a user catalog a webpage or article. Analyze the content and generate metadata.\n\nGiven the webpage text, generate:\n1. **Title**: Article/page title (max 100 characters)\n2. **Summary**: Brief description of the content\n3. **Topics**: 3-5 relevant categories\n\nConsider:\n- News articles: Focus on main story\n- Tutorials: Highlight what will be learned\n- Reference pages: Summarize key information\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating URL fields...'
        },
        imageAutoPopulate: {
          label: 'Image Auto-Populate Prompt',
          content: 'You are helping a user catalog an image for educational use. Based on image analysis results (OCR text, detected objects, scene description), generate metadata.\n\nGiven the image analysis data, generate:\n1. **Title**: Descriptive title for the image (max 100 characters)\n2. **Summary**: What the image shows and its educational value\n3. **Topics**: 3-5 relevant subject areas\n\nConsider:\n- Diagrams: Technical subject matter\n- Charts/Graphs: Data and trends\n- Photos: Subject and context\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating image fields...'
        }
      }
    },
    {
      id: 'content-analyzer',
      name: 'Content Analyzer',
      icon: '🔍',
      description: 'Analyzes content sources (PDF, URL, text, video) and identifies which interaction types can be generated with high confidence',
      prompts: {
        pdfAnalysis: {
          label: 'PDF Analysis Prompt',
          content: 'You are analyzing a PDF document to identify possible educational interactions and extract or construct their input data sets.\n\nFROM CONTENT: {contentText}\n\nTASK: Analyze the content and identify which interaction types can be populated with data from this content.\n\nCRITICAL RULES:\n1. FAITHFULNESS TO SOURCE: The generated JSON must be FAITHFUL to the source content. If you cannot find suitable content in the source to generate the necessary input data for an interaction and format it correctly in JSON, DO NOT generate that interaction. Only include interactions where the source content provides sufficient material.\n2. GAP FILLING: You may fill in small gaps (e.g., minor clarifications, formatting adjustments) but ONLY to a minimal degree. The vast majority of the data must come directly from the source content.\n3. CONFIDENCE SCORE: Your confidence score (0.0-1.0) should reflect how faithful the generated JSON is to the source content:\n   - 0.9-1.0: Content directly supports the interaction with clear, extractable data\n   - 0.7-0.89: Content supports the interaction but requires minor interpretation or small gaps filled\n   - 0.5-0.69: Content partially supports the interaction but requires significant interpretation\n   - Below 0.5: Content does not adequately support the interaction - DO NOT include this interaction\n\nINSTRUCTIONS:\n1. FIRST, check if the content already contains structured data (e.g., True/False statements, fragments, steps, comparisons)\n2. If the content ALREADY contains True/False statements, fragments, or other structured data:\n   - EXTRACT them directly from the content\n   - Format them according to the exact sample data format for that interaction type\n   - DO NOT generate new content - use what is already in the source\n3. If the content does NOT contain structured data but could support it:\n   - Only generate input data sets if the source content provides sufficient material\n   - If the source content is insufficient, DO NOT include that interaction type\n   - Follow the exact format shown in the "Sample" tab of the interaction builder\n4. For each identified interaction type, rate confidence (0.0-1.0) based on faithfulness to source and explain why this interaction fits\n\nIMPORTANT: You will be provided with a list of all available interaction types and their sample input data formats. You MUST follow those exact formats when extracting or constructing input data sets. Only include interactions where the source content genuinely supports them.\n\nReturn JSON with ranked interaction suggestions and extracted/constructed input data. Omit any interactions that cannot be faithfully generated from the source content.',
          placeholder: 'Enter the prompt for analyzing PDF content sources...'
        },
        urlAnalysis: {
          label: 'URL/Webpage Analysis Prompt',
          content: 'You are analyzing webpage content to identify possible educational interactions and extract or construct their input data sets.\n\nFROM CONTENT: {contentText}\n\nTASK: Analyze the content and identify which interaction types can be populated with data from this content.\n\nCRITICAL RULES:\n1. FAITHFULNESS TO SOURCE: The generated JSON must be FAITHFUL to the source content. If you cannot find suitable content in the source to generate the necessary input data for an interaction and format it correctly in JSON, DO NOT generate that interaction. Only include interactions where the source content provides sufficient material.\n2. GAP FILLING: You may fill in small gaps (e.g., minor clarifications, formatting adjustments) but ONLY to a minimal degree. The vast majority of the data must come directly from the source content.\n3. CONFIDENCE SCORE: Your confidence score (0.0-1.0) should reflect how faithful the generated JSON is to the source content:\n   - 0.9-1.0: Content directly supports the interaction with clear, extractable data\n   - 0.7-0.89: Content supports the interaction but requires minor interpretation or small gaps filled\n   - 0.5-0.69: Content partially supports the interaction but requires significant interpretation\n   - Below 0.5: Content does not adequately support the interaction - DO NOT include this interaction\n\nINSTRUCTIONS:\n1. FIRST, check if the content already contains structured data (e.g., True/False statements, fragments, steps, comparisons)\n2. If the content ALREADY contains True/False statements, fragments, or other structured data:\n   - EXTRACT them directly from the content\n   - Format them according to the exact sample data format for that interaction type\n   - DO NOT generate new content - use what is already in the source\n3. If the content does NOT contain structured data but could support it:\n   - Only generate input data sets if the source content provides sufficient material\n   - If the source content is insufficient, DO NOT include that interaction type\n   - Follow the exact format shown in the "Sample" tab of the interaction builder\n4. For each identified interaction type, rate confidence (0.0-1.0) based on faithfulness to source\n\nConsider:\n- Article structure and clarity\n- Presence of examples, comparisons, processes\n- Complexity and reading level\n\nIMPORTANT: You will be provided with a list of all available interaction types and their sample input data formats. You MUST follow those exact formats when extracting or constructing input data sets. Only include interactions where the source content genuinely supports them.\n\nReturn JSON with ranked interaction suggestions and extracted/constructed input data. Omit any interactions that cannot be faithfully generated from the source content.',
          placeholder: 'Enter the prompt for analyzing web content...'
        },
        textAnalysis: {
          label: 'Text Input Analysis Prompt',
          content: 'You are analyzing raw text input to identify possible educational interactions and extract or construct their input data sets.\n\nFROM CONTENT: {contentText}\n\nTASK: Analyze the content and identify which interaction types can be populated with data from this content.\n\nCRITICAL RULES:\n1. FAITHFULNESS TO SOURCE: The generated JSON must be FAITHFUL to the source content. If you cannot find suitable content in the source to generate the necessary input data for an interaction and format it correctly in JSON, DO NOT generate that interaction. Only include interactions where the source content provides sufficient material.\n2. GAP FILLING: You may fill in small gaps (e.g., minor clarifications, formatting adjustments) but ONLY to a minimal degree. The vast majority of the data must come directly from the source content.\n3. CONFIDENCE SCORE: Your confidence score (0.0-1.0) should reflect how faithful the generated JSON is to the source content:\n   - 0.9-1.0: Content directly supports the interaction with clear, extractable data\n   - 0.7-0.89: Content supports the interaction but requires minor interpretation or small gaps filled\n   - 0.5-0.69: Content partially supports the interaction but requires significant interpretation\n   - Below 0.5: Content does not adequately support the interaction - DO NOT include this interaction\n\nINSTRUCTIONS:\n1. FIRST, check if the content already contains structured data (e.g., True/False statements, fragments, steps, comparisons)\n2. If the content ALREADY contains True/False statements, fragments, or other structured data:\n   - EXTRACT them directly from the content\n   - Format them according to the exact sample data format for that interaction type\n   - DO NOT generate new content - use what is already in the source\n3. If the content does NOT contain structured data but could support it:\n   - Only generate input data sets if the source content provides sufficient material\n   - If the source content is insufficient, DO NOT include that interaction type\n   - Follow the exact format shown in the "Sample" tab of the interaction builder\n4. For each identified interaction type, rate confidence (0.0-1.0) based on faithfulness to source\n\nPrioritize:\n- Clear concepts and statements (Fragment Builder, True/False)\n- Cause-effect relationships (Prediction Branching)\n- Comparisons (Analogy Bridge)\n- Step-by-step processes (Stepping Stones)\n\nIMPORTANT: You will be provided with a list of all available interaction types and their sample input data formats. You MUST follow those exact formats when extracting or constructing input data sets. Only include interactions where the source content genuinely supports them.\n\nReturn JSON with ranked interaction suggestions and extracted/constructed input data. Omit any interactions that cannot be faithfully generated from the source content.',
          placeholder: 'Enter the prompt for analyzing text input...'
        },
        videoTranscriptAnalysis: {
          label: 'Video Transcript Analysis Prompt',
          content: 'You are analyzing a video transcript to identify possible educational interactions and extract or construct their input data sets.\n\nFROM CONTENT: {contentText}\n\nTASK: Analyze the transcript and identify which interaction types can be populated with data from this content.\n\nCRITICAL RULES:\n1. FAITHFULNESS TO SOURCE: The generated JSON must be FAITHFUL to the source content. If you cannot find suitable content in the source to generate the necessary input data for an interaction and format it correctly in JSON, DO NOT generate that interaction. Only include interactions where the source content provides sufficient material.\n2. GAP FILLING: You may fill in small gaps (e.g., minor clarifications, formatting adjustments) but ONLY to a minimal degree. The vast majority of the data must come directly from the source content.\n3. CONFIDENCE SCORE: Your confidence score (0.0-1.0) should reflect how faithful the generated JSON is to the source content:\n   - 0.9-1.0: Content directly supports the interaction with clear, extractable data\n   - 0.7-0.89: Content supports the interaction but requires minor interpretation or small gaps filled\n   - 0.5-0.69: Content partially supports the interaction but requires significant interpretation\n   - Below 0.5: Content does not adequately support the interaction - DO NOT include this interaction\n\nINSTRUCTIONS:\n1. FIRST, check if the transcript already contains structured data (e.g., True/False statements, fragments, steps, comparisons, Q&A patterns)\n2. If the transcript ALREADY contains True/False statements, fragments, or other structured data:\n   - EXTRACT them directly from the transcript\n   - Format them according to the exact sample data format for that interaction type\n   - DO NOT generate new content - use what is already in the source\n3. If the transcript does NOT contain structured data but could support it:\n   - Only generate input data sets if the source content provides sufficient material\n   - If the source content is insufficient, DO NOT include that interaction type\n   - Follow the exact format shown in the "Sample" tab of the interaction builder\n4. Identify interaction types that leverage:\n   - Temporal flow of information\n   - Visual descriptions (for Mystery Reveal, Hotspot Explorer)\n   - Demonstrations and explanations\n   - Q&A patterns\n5. Include timestamp hints where relevant\n6. For each identified interaction type, rate confidence (0.0-1.0) based on faithfulness to source\n\nIMPORTANT: You will be provided with a list of all available interaction types and their sample input data formats. You MUST follow those exact formats when extracting or constructing input data sets. Only include interactions where the source content genuinely supports them.\n\nReturn JSON with ranked interaction suggestions, timestamp hints, and extracted/constructed input data. Omit any interactions that cannot be faithfully generated from the source content.',
          placeholder: 'Enter the prompt for analyzing video transcripts...'
        },
        iframeGuideUrlAnalysis: {
          label: 'iFrame Guide URL Analysis Prompt',
          content: 'You are analyzing a webpage that will be used as a guide for an iframe interaction in an educational lesson. Your task is to extract any content relating to steps, guidance, or instructions on how to play a game or navigate a web app.\n\nAnalyze the webpage content and return a concise digest in JSON format that can be used as a reference to help an LLM guide a user through the process in conjunction with screenshots that will be shared as the user attempts it.\n\nIf the webpage contains guidance for:\n- Game play instructions or rules\n- Step-by-step navigation instructions\n- UI element explanations\n- Feature usage guides\n- Tutorial content\n\nReturn JSON format:\n{\n  "hasGuidance": true,\n  "guidance": {\n    "steps": ["step 1", "step 2", ...],\n    "keyElements": ["element1", "element2", ...],\n    "instructions": "concise guidance text",\n    "tips": ["tip1", "tip2", ...]\n  }\n}\n\nIf the webpage has no such guidance, return:\n{\n  "hasGuidance": false,\n  "message": "No guidance for web app navigation or game play found"\n}',
          placeholder: 'Enter the prompt for analyzing iframe guide URLs...'
        },
        iframeGuideDocAnalysis: {
          label: 'iFrame Guide Doc Analysis Prompt',
          content: 'You are analyzing a document (PDF, image, or other file) that will be used as a guide for an iframe interaction in an educational lesson. Your task is to extract any content relating to steps, guidance, or instructions on how to play a game or navigate a web app.\n\nAnalyze the document content and return a concise digest in JSON format that can be used as a reference to help an LLM guide a user through the process in conjunction with screenshots that will be shared as the user attempts it.\n\nIf the document contains guidance for:\n- Game play instructions or rules\n- Step-by-step navigation instructions\n- UI element explanations\n- Feature usage guides\n- Tutorial content\n- Diagrams or visual guides\n\nReturn JSON format:\n{\n  "hasGuidance": true,\n  "guidance": {\n    "steps": ["step 1", "step 2", ...],\n    "keyElements": ["element1", "element2", ...],\n    "instructions": "concise guidance text",\n    "tips": ["tip1", "tip2", ...],\n    "visualReferences": ["description of diagram 1", "description of diagram 2", ...]\n  }\n}\n\nIf the document has no such guidance, return:\n{\n  "hasGuidance": false,\n  "message": "No guidance for web app navigation or game play found"\n}',
          placeholder: 'Enter the prompt for analyzing iframe guide documents...'
        }
      }
    },
    {
      id: 'scaffolder',
      name: 'Scaffolder',
      icon: '🏗️',
      description: 'Builds complete lessons from prompts, browsing internet, running content processors, and generating lesson JSON based on TEACH framework',
      prompts: {
        lessonGeneration: {
          label: 'Lesson Generation Prompt',
          content: 'You are an expert educational scaffolder. Given a topic and learning objectives, create a complete lesson following the TEACH framework (Tease, Engage, Absorb, Challenge, Hone)...',
          placeholder: 'Enter the prompt for generating complete lessons...'
        },
        contentSelection: {
          label: 'Content Selection Prompt',
          content: 'Analyze available content sources and select the most relevant ones for the given learning objectives...',
          placeholder: 'Enter the prompt for selecting appropriate content...'
        },
        interactionSelection: {
          label: 'Interaction Type Selection',
          content: 'Given the lesson stage and content, suggest the most appropriate interaction types that will engage students and reinforce learning...',
          placeholder: 'Enter the prompt for choosing interaction types...'
        }
      }
    },
    {
      id: 'lesson-builder',
      name: 'Lesson-Builder Assistant',
      icon: '📚',
      description: 'Assists with updating lesson JSON, processing content, and suggesting improvements to lesson structure',
      prompts: {
        lessonUpdate: {
          label: 'Lesson Update Prompt',
          content: 'You are helping a teacher update their lesson. Analyze the current lesson structure and suggest improvements while maintaining the TEACH framework...',
          placeholder: 'Enter the prompt for lesson updates...'
        },
        contentProcessing: {
          label: 'Content Processing Recommendation',
          content: 'Given new content added to a lesson, recommend the best processing methods and interaction types...',
          placeholder: 'Enter the prompt for content processing recommendations...'
        }
      }
    },
    {
      id: 'ai-interaction-handler',
      name: 'AI Interaction Handler',
      icon: '🤖',
      description: 'Manages prompts for interactions. This is a multi-layer prompt system: base + SDK content + event handling + response format + interaction context + custom instructions. Used by all interactions when communicating with the AI Interaction Handler.',
      prompts: {
        'base-system': {
          label: 'Base System Prompt',
          content: 'You are an AI Interaction Handler helping students learn through interactive activities.\n\n**IMPORTANT:** After this base prompt, you will receive:\n1. SDK Reference - Information about available event types, response actions, and response structure\n2. Event Handling Instructions - How to respond to different types of events\n3. Response Format Instructions - How to structure your responses\n4. Interaction Context - The specific interaction type, processed content data, current state, and recent events\n5. Custom Instructions - Interaction-specific guidance from the lesson builder\n\n**Your role:**\n- Provide helpful, encouraging guidance based on the interaction context\n- Use the processed content data to inform your responses\n- Respond appropriately to events based on the event handling instructions\n- Format your responses according to the response format instructions\n- Follow any custom instructions provided for this specific interaction\n- Explain concepts clearly and simply\n- Give hints when students struggle\n- Celebrate correct answers\n- Guide students toward understanding without giving away answers\n\n**Response approach:**\n- Be concise and friendly\n- Use age-appropriate language\n- Focus on learning, not just correctness\n- Ask questions to encourage thinking\n- Consider the interaction state and recent events when responding',
          placeholder: 'Enter the base system prompt for AI Interaction Handler...'
        },
        'sdk-content': {
          label: 'SDK Content Reference (For AI Interaction Handler Responses)',
          content: '**Purpose:** This reference helps the AI Interaction Handler respond to students during interactions and provide instructions for the interaction to execute.\n\n## Available Event Types\n\nInteractions can emit various event types. Common standard events include:\n- `user-selection`: User selected an option/item\n- `user-input`: User entered text or data\n- `progress-update`: Progress changed\n- `score-change`: Score changed\n- `hint-request`: User requested a hint\n- `explanation-request`: User requested an explanation\n- `interaction-started`: Interaction began\n- `interaction-completed`: Interaction finished\n\n**Note:** Interactions can also emit custom event types. The event data will include the event type and relevant information.\n\n## Response Actions\n\nThe AI Interaction Handler can request the interaction to perform actions by including them in responses:\n- `highlight`: Highlight a specific element (target should be element ID or index)\n- `show-hint`: Display a hint message (data should include the hint text)\n- `update-ui`: Update UI elements (data should include update instructions)\n- `play-sound`: Play a sound effect (data should include sound identifier)\n- Custom actions as defined by the interaction\n\n## Response Display Modes\n\nYour responses can be displayed in different ways. Use metadata flags to control how responses are shown:\n\n**Display Options:**\n- **Chat UI**: Default mode - responses appear in the chat history of the AI Teacher widget\n- **Snack Message**: Temporary notification at the top of the screen (useful for quick hints, mobile-friendly)\n- **Script Block**: Displayed as a prominent script block in the teacher widget (for important announcements)\n\n**When to Use Each Mode:**\n- **Chat UI** (default): For conversational responses, detailed explanations, follow-up questions\n- **Snack Message**: For brief hints, quick confirmations, non-intrusive feedback (especially on mobile)\n- **Script Block**: For important announcements, welcome messages, key instructions that should be prominent\n\n## Response Structure with Display Control\n\nResponses should be structured as follows:\n```json\n{\n  "response": "Your main text response to the student",\n  "actions": [\n    {\n      "type": "highlight",\n      "target": "element-id-or-index",\n      "data": {}\n    }\n  ],\n  "stateUpdates": {\n    "key": "value"\n  },\n  "metadata": {\n    "showInSnack": true,           // Show in snack message instead of chat\n    "snackDuration": 3000,        // Duration in milliseconds (optional, undefined = until closed)\n    "postToChat": true,           // Also post to chat UI (can combine with snack)\n    "openChatUI": true,           // Open/restore chat widget if minimized\n    "showAsScript": false,        // Display as script block instead of chat message\n    "confidence": 0.9,            // Your confidence in the response (0.0-1.0)\n    "suggestedNextStep": "..."    // Optional suggestion for next step\n  }\n}\n```\n\n**Display Metadata Guidelines:**\n- Use `showInSnack: true` for brief, non-intrusive messages (hints, quick confirmations)\n- Set `snackDuration` (milliseconds) for auto-hiding snacks, or omit for manual close\n- Use `showAsScript: true` for important announcements that need prominence\n- Use `openChatUI: true` when you want to ensure the chat is visible for longer conversations\n- You can combine modes (e.g., show in snack AND post to chat for persistence)\n\nIf returning only text, simply provide the text response. The system will parse structured JSON if present.',
          placeholder: 'Enter the SDK content reference for AI Interaction Handler responses during interactions...'
        },
        'event-handling': {
          label: 'Event Handling Instructions',
          content: '## How to Respond to Events\n\n**User Actions (`user-selection`, `user-input`):**\n- Provide immediate feedback on the action\n- If incorrect, offer guidance without revealing the answer\n- If correct, acknowledge and encourage\n- Consider the context from processed content and interaction state\n\n**Progress Updates (`progress-update`, `score-change`):**\n- Acknowledge progress positively\n- If progress is slow, offer encouragement and strategies\n- If score is low, provide targeted help\n- Celebrate improvements\n\n**AI Requests (`hint-request`, `explanation-request`):**\n- Provide helpful hints that guide without giving away answers\n- Break down complex concepts into simpler parts\n- Use examples from the processed content when relevant\n- Encourage the student to think through the problem\n\n**Lifecycle Events (`interaction-started`, `interaction-completed`):**\n- Welcome students at the start\n- Provide summary and encouragement at completion\n- Highlight key learnings\n\n**Custom Events:**\n- Respond based on the event data provided\n- Use the interaction context to inform your response\n- Follow any custom instructions for this interaction',
          placeholder: 'Enter instructions for how to handle different event types...'
        },
        'response-format': {
          label: 'Response Format Instructions',
          content: '## Response Format Guidelines\n\n**Text-Only Responses:**\n- Provide clear, concise text\n- Be encouraging and supportive\n- Use appropriate tone for the student\'s age level\n- Keep responses focused and actionable\n\n**Structured Responses (with actions):**\n- Include a text response that explains what you\'re doing\n- Specify actions clearly with type, target, and data\n- Ensure actions are appropriate for the interaction type\n- Actions should enhance learning, not distract\n\n**State Updates:**\n- Only update state when necessary\n- Use clear, descriptive keys\n- Keep state updates minimal and relevant\n\n**Display Mode Selection:**\n- **Brief hints/confirmations** → Use `showInSnack: true` with appropriate duration\n- **Detailed explanations** → Use default chat UI (or `postToChat: true`)\n- **Important announcements** → Use `showAsScript: true` for prominence\n- **Mobile-friendly guidance** → Prefer snack messages for quick, non-intrusive feedback\n- **Complex responses** → Use chat UI to allow scrolling and persistence\n\n**Best Practices:**\n- Always provide a text response, even when using actions\n- Explain why you\'re taking an action\n- Ensure actions align with learning objectives\n- Consider the student\'s current state and progress\n- Choose display mode based on message importance and length\n- Use snack messages for brief feedback to avoid interrupting the interaction flow\n- Use chat UI for longer explanations that students may want to reference\n- Use script blocks sparingly for truly important announcements',
          placeholder: 'Enter instructions for formatting responses...'
        }
      }
    },
    {
      id: 'teacher',
      name: 'AI Teacher (Tutor)',
      icon: '👨‍🏫',
      description: 'Provides real-time feedback during lessons, recognizes student struggles, and stores feedback for lesson improvements',
      prompts: {
        general: {
          label: 'AI Teacher General Prompt',
          content: 'You are an AI Teacher assistant helping students learn through interactive lessons. Your role is to answer questions, provide context, encourage learning, clarify concepts, and guide discovery...',
          placeholder: 'Enter the general prompt for the AI Teacher assistant...'
        },
        'screenshot-criteria': {
          label: 'Screenshot Request Criteria',
          content: 'You should request a screenshot of the lesson-view area when visual context is needed, interaction issues occur, layout/display questions arise, progress/state questions are asked, or context is unclear...',
          placeholder: 'Enter the criteria for when to request screenshots...'
        },
        'conversation-summary': {
          label: 'Conversation History Summary',
          content: 'You are a helpful assistant that summarizes conversation history concisely while preserving important context...',
          placeholder: 'Enter the prompt for summarizing conversation history...'
        },
        'iframe-screenshot': {
          label: 'IFrame Screenshot Prompt',
          content: 'You are analyzing a screenshot of an iframed website that a student is interacting with during a lesson. Your role is to provide very brief, helpful guidance...',
          placeholder: 'Enter the prompt for analyzing iframe screenshots...'
        },
        feedbackGeneration: {
          label: 'Student Feedback Prompt',
          content: 'You are an encouraging AI tutor. The student just answered a question incorrectly. Provide helpful, constructive feedback that guides them toward the correct answer without giving it away...',
          placeholder: 'Enter the prompt for generating student feedback...'
        },
        struggleRecognition: {
          label: 'Struggle Recognition Prompt',
          content: 'Analyze student performance data to identify patterns of struggle. Suggest personalized interventions or alternative explanations...',
          placeholder: 'Enter the prompt for recognizing when students struggle...'
        },
        encouragement: {
          label: 'Encouragement Prompt',
          content: 'Generate encouraging messages when students succeed or make progress. Celebrate their achievements while motivating continued effort...',
          placeholder: 'Enter the prompt for student encouragement...'
        }
      }
    },
    {
      id: 'optimiser',
      name: 'Lesson Optimiser',
      icon: '⚡',
      description: 'Analyzes lesson feedback data, identifies areas for improvement, and proposes specific changes to enhance learning outcomes',
      prompts: {
        feedbackAnalysis: {
          label: 'Feedback Analysis Prompt',
          content: 'Analyze aggregated student feedback and performance data for this lesson. Identify the top 3 areas where students struggle most...',
          placeholder: 'Enter the prompt for analyzing feedback...'
        },
        improvementSuggestion: {
          label: 'Improvement Suggestion Prompt',
          content: 'Based on the analysis, propose specific, actionable changes to the lesson. For each suggestion, explain the expected impact on learning outcomes...',
          placeholder: 'Enter the prompt for suggesting improvements...'
        }
      }
    },
    {
      id: 'lesson-approver',
      name: 'Lesson Approver',
      icon: '✅',
      description: 'Reviews submitted lessons for quality, pedagogical soundness, and adherence to platform standards before publication',
      prompts: {
        qualityReview: {
          label: 'Quality Review Prompt',
          content: 'You are reviewing a lesson for quality and pedagogical soundness. Check for: clear learning objectives, logical flow, appropriate difficulty, accessibility, and engagement. Provide a detailed assessment...',
          placeholder: 'Enter the prompt for quality review...'
        },
        standardsCheck: {
          label: 'Standards Compliance Prompt',
          content: 'Review the lesson against platform standards: TEACH framework compliance, appropriate use of interactions, content attribution, age-appropriateness, and technical requirements...',
          placeholder: 'Enter the prompt for standards checking...'
        },
        feedbackGeneration: {
          label: 'Rejection Feedback Prompt',
          content: 'The lesson did not meet approval standards. Generate constructive feedback explaining what needs to be improved and how to fix it...',
          placeholder: 'Enter the prompt for rejection feedback...'
        }
      }
    },
    {
      id: 'scaffolder',
      name: 'Scaffolder (Super-Lesson-Builder)',
      icon: '🏗️',
      description: 'Builds complete lesson JSON files from processed content sources and user prompts. Creates stages, substages, scripts with timestamps, and embedded interactions based on content analysis.',
      prompts: {
        buildCompleteLesson: {
          label: 'Build Complete Lesson Prompt',
          content: `You are the Scaffolder AI, responsible for creating complete, self-contained lesson JSON files.

**INPUT:**
- Processed content sources (each with possible interaction types identified by Content Analyzer)
- User requirements (topic, objectives, difficulty level, duration)
- TEACH framework preferences (Tease, Expose, Absorb, Contribute, Hone)

**YOUR TASK:**
Create a complete lesson JSON file following this EXACT structure:

\`\`\`json
{
  "id": "uuid-v4",
  "title": "Lesson Title",
  "description": "Brief description",
  "thumbnailUrl": "https://...",
  "category": "Science|Math|Language|etc",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedDuration": 15,
  "tags": ["tag1", "tag2"],
  "objectives": {
    "learningObjectives": ["Objective 1", "Objective 2"],
    "topics": ["topic1", "topic2"]
  },
  "stages": [
    {
      "id": "stage-1",
      "type": "tease|expose|absorb|contribute|hone",
      "title": "Stage Title",
      "order": 0,
      "duration": 10,
      "description": "Stage description",
      "aiPrompt": "You are teaching [topic]. Help students understand...",
      "subStages": [
        {
          "id": "substage-1-1",
          "title": "Substage Title",
          "order": 0,
          "scriptBlocks": [
            {
              "id": "script-1-1-intro",
              "order": 0,
              "idealTimestamp": 0,
              "text": "Welcome! Today we'll learn about...",
              "estimatedDuration": 15,
              "audioUrl": null,
              "playbackRules": {
                "autoPlay": true,
                "canSkip": true,
                "pauseOnInteraction": false,
                "displayIfMissed": "asap"
              }
            },
            {
              "id": "script-1-1-pre-interaction",
              "order": 1,
              "idealTimestamp": 20,
              "text": "Now let's test your understanding...",
              "estimatedDuration": 8,
              "playbackRules": {
                "autoPlay": true,
                "canSkip": true,
                "pauseOnInteraction": true,
                "displayIfMissed": "asap"
              }
            }
          ],
          "interaction": {
            "type": "true-false-selection|fragment-builder|etc",
            "config": {
              // FULL interaction data from processed content
            }
          },
          "scriptBlocksAfterInteraction": [
            {
              "id": "script-1-1-post",
              "order": 0,
              "idealTimestamp": 0,
              "triggerCondition": "interactionComplete",
              "text": "Great work! You scored {score}%...",
              "estimatedDuration": 8,
              "playbackRules": {
                "autoPlay": true,
                "displayIfMissed": "never"
              }
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

**CRITICAL RULES:**
1. ALL interaction data must be EMBEDDED (no external IDs)
2. Scripts use idealTimestamp (seconds from substage start)
3. displayIfMissed: "asap" | "never" | "onRequest"
4. Each substage: intro scripts → interaction → wrap-up scripts
5. Scripts guide student through the learning journey
6. Use processed content interaction configs directly
7. Generate engaging, clear, encouraging script text
8. Structure follows TEACH framework

Return ONLY valid JSON.`,
          placeholder: 'Enter the prompt for building complete lessons from processed content...'
        },
        updateExistingLesson: {
          label: 'Update Existing Lesson Prompt',
          content: `You are updating an existing lesson JSON based on user feedback or new content.

Given:
- Current lesson JSON
- Update request (add substage, modify script, change interaction, etc.)
- New processed content (if applicable)

Return the complete updated lesson JSON maintaining the same structure.

Preserve:
- Lesson ID and metadata
- Existing structure unless explicitly changing
- Script flow and timestamps
- All embedded interaction data

Return ONLY valid JSON.`,
          placeholder: 'Enter the prompt for updating existing lessons...'
        },
        generateScripts: {
          label: 'Generate Script Blocks Prompt',
          content: `You are generating script blocks for a substage.

Given:
- Content topic
- Interaction type and data
- Stage context (Tease, Expose, Absorb, etc.)
- Target audience (age, difficulty level)

Generate 2-3 script blocks:
1. **Intro** (t=0s): Hook, context, why this matters
2. **Pre-interaction** (t=15-30s): Setup, instructions, prepare for activity
3. **Post-interaction** (after completion): Praise, reinforce learning, transition

Script Guidelines:
- Conversational, encouraging tone
- Clear, concise (15-30 seconds spoken)
- Reference interaction results with {score}
- Age-appropriate language
- Build excitement and curiosity

Return JSON array of script blocks with timestamps and playback rules.`,
          placeholder: 'Enter the prompt for generating script blocks...'
        }
      }
    },
    {
      id: 'personaliser',
      name: 'Personaliser',
      icon: '🎯',
      description: 'Adapts lesson content to match individual student preferences and interests (e.g., changing "football" examples to "tennis" for tennis enthusiasts)',
      prompts: {
        exampleAdaptation: {
          label: 'Example Adaptation Prompt',
          content: 'You are personalizing a lesson for a student based on their interests and preferences. Given the original lesson content and the student\'s profile (interests, hobbies, preferred subjects), make subtle adjustments to examples, analogies, and scenarios to better resonate with them.\n\nGuidelines:\n- Keep the core educational content unchanged\n- Only modify examples, analogies, and non-essential context\n- Maintain the same difficulty level\n- Preserve learning objectives\n- Make changes feel natural, not forced\n\nExample: If the lesson uses "kicking a football" and the student likes tennis, change it to "serving a tennis ball"\n\nReturn modified lesson JSON with only the necessary changes.',
          placeholder: 'Enter the prompt for adapting examples to student interests...'
        },
        preferenceDetection: {
          label: 'Preference Detection Prompt',
          content: 'Analyze student interaction history, content engagement patterns, and explicit preferences to identify opportunities for personalization.\n\nIdentify:\n- Favorite topics and subjects\n- Preferred types of examples (sports, music, technology, nature, etc.)\n- Learning style preferences (visual, hands-on, theoretical)\n- Cultural context and background\n\nReturn JSON with personalization recommendations for this student.',
          placeholder: 'Enter the prompt for detecting student preferences...'
        },
        culturalAdaptation: {
          label: 'Cultural Adaptation Prompt',
          content: 'Adapt lesson content to be more culturally relevant and relatable for students from different backgrounds.\n\nConsider:\n- Local sports, games, and activities\n- Regional foods and customs\n- Measurement systems (metric vs imperial)\n- Currency and pricing examples\n- Historical and cultural references\n\nReturn culturally adapted lesson JSON that maintains educational integrity while improving relatability.',
          placeholder: 'Enter the prompt for cultural adaptation...'
        }
      }
    },
    {
      id: 'inventor',
      name: 'Inventor (Interaction Builder)',
      icon: '🔧',
      description: 'Helps interaction-builders create and troubleshoot HTML, PixiJS, and iFrame interactions. Provides guidance for Settings, Code, Config Schema, and Sample Data tabs.',
      prompts: {
        'html-interaction': {
          label: 'HTML Interaction Assistant',
          content: 'Loading from database...',
          placeholder: 'Provide guidance for building HTML interactions...'
        },
        'pixijs-interaction': {
          label: 'PixiJS Interaction Assistant',
          content: 'Loading from database...',
          placeholder: 'Provide guidance for building PixiJS interactions...'
        },
        'iframe-interaction': {
          label: 'iFrame Interaction Assistant',
          content: 'Loading from database...',
          placeholder: 'Provide guidance for configuring iFrame embeds...'
        },
        'general': {
          label: 'General Interaction Assistant',
          content: 'Loading from database...',
          placeholder: 'Provide general interaction design guidance...'
        },
        'sdk-html': {
          label: 'SDK Reference: HTML Interactions',
          content: `## AI Teacher SDK for HTML Interactions

**Integration:** HTML interactions run in iframes. Use \`createIframeAISDK()\` to access the AI Teacher.

**Setup:**
\`\`\`javascript
const aiSDK = createIframeAISDK();
aiSDK.isReady((ready) => {
  if (ready) {
    // SDK ready
  }
});
\`\`\`

**Core Methods:**
- \`aiSDK.emitEvent({ type, data, requiresLLMResponse })\` - Send events
- \`aiSDK.updateState(key, value)\` - Update state
- \`aiSDK.onResponse(callback)\` - Receive AI responses
- \`aiSDK.onAction(type, callback)\` - Handle specific actions

**Display Methods:**
- \`aiSDK.postToChat(content, role, openChat)\` - Post message to chat UI
- \`aiSDK.showScript(text, openChat)\` - Display as script block
- \`aiSDK.showSnack(content, duration)\` - Show snack message (returns message ID)
- \`aiSDK.hideSnack()\` - Hide current snack message

**Standard Events:** \`user-selection\`, \`user-input\`, \`hint-request\`, \`interaction-submit\`, \`interaction-complete\`

**Response Actions:** \`highlight\`, \`show-hint\`, \`update-ui\`

**Response Display:** AI responses include metadata for display control:
- \`metadata.showInSnack\` - Show in snack message
- \`metadata.snackDuration\` - Snack duration (ms, optional)
- \`metadata.postToChat\` - Also post to chat
- \`metadata.openChatUI\` - Open chat if minimized
- \`metadata.showAsScript\` - Show as script block

**Data Storage Methods:**
- \`aiSDK.saveInstanceData(data)\` - Save anonymous instance data (accessible to builders/admins)
- \`aiSDK.getInstanceDataHistory(filters?)\` - Get historical instance data (builders/admins only)
- \`aiSDK.saveUserProgress({ score, completed, customData, ... })\` - Save user progress
- \`aiSDK.getUserProgress()\` - Get current user's progress
- \`aiSDK.markCompleted()\` - Mark interaction as completed
- \`aiSDK.incrementAttempts()\` - Increment attempts counter
- \`aiSDK.getUserPublicProfile(userId?)\` - Get user's public profile (if shared)

**Note:** Instance data and user progress schemas are defined by interaction builders in the Data Storage tab. Only fields defined in schemas will be validated.

**Example:**
\`\`\`javascript
// On user click
aiSDK.emitEvent({
  type: 'user-selection',
  data: { index: 0, isCorrect: true },
  requiresLLMResponse: true
});

// Handle AI response
aiSDK.onResponse((r) => {
  // Response automatically displayed based on metadata
  // Or manually control display:
  if (r.metadata?.showInSnack) {
    aiSDK.showSnack(r.response, r.metadata.snackDuration);
  }
  if (r.actions) {
    r.actions.forEach(a => {
      if (a.type === 'highlight') highlightElement(a.target);
    });
  }
});

// Save instance data (anonymous)
await aiSDK.saveInstanceData({
  selectedFragments: [0, 2, 4],
  timeToFirstSelection: 3.5
});

// Save user progress
await aiSDK.saveUserProgress({
  score: 85,
  completed: true,
  customData: {
    difficultyRating: 3
  }
});
\`\`\``,
          placeholder: 'Enter condensed SDK documentation for HTML interactions...'
        },
        'sdk-pixijs': {
          label: 'SDK Reference: PixiJS Interactions',
          content: `## AI Teacher SDK for PixiJS Interactions

**Integration:** PixiJS interactions run in iframes. Use \`createIframeAISDK()\` to access the AI Teacher.

**Setup:**
\`\`\`javascript
const aiSDK = createIframeAISDK();
aiSDK.isReady((ready) => {
  if (ready) {
    // SDK ready
  }
});
\`\`\`

**Core Methods:**
- \`aiSDK.emitEvent({ type, data, requiresLLMResponse })\` - Send events
- \`aiSDK.updateState(key, value)\` - Update state
- \`aiSDK.onResponse(callback)\` - Receive AI responses
- \`aiSDK.onAction(type, callback)\` - Handle specific actions

**Display Methods:**
- \`aiSDK.postToChat(content, role, openChat)\` - Post message to chat UI
- \`aiSDK.showScript(text, openChat)\` - Display as script block
- \`aiSDK.showSnack(content, duration)\` - Show snack message (returns message ID)
- \`aiSDK.hideSnack()\` - Hide current snack message

**Standard Events:** \`user-selection\`, \`progress-update\`, \`score-change\`, \`interaction-complete\`

**Response Actions:** \`highlight\`, \`show-hint\`, \`update-ui\`

**Response Display:** AI responses include metadata for display control:
- \`metadata.showInSnack\` - Show in snack message
- \`metadata.snackDuration\` - Snack duration (ms, optional)
- \`metadata.postToChat\` - Also post to chat
- \`metadata.openChatUI\` - Open chat if minimized
- \`metadata.showAsScript\` - Show as script block

**Data Storage Methods:**
- \`aiSDK.saveInstanceData(data)\` - Save anonymous instance data (accessible to builders/admins)
- \`aiSDK.getInstanceDataHistory(filters?)\` - Get historical instance data (builders/admins only)
- \`aiSDK.saveUserProgress({ score, completed, customData, ... })\` - Save user progress
- \`aiSDK.getUserProgress()\` - Get current user's progress
- \`aiSDK.markCompleted()\` - Mark interaction as completed
- \`aiSDK.incrementAttempts()\` - Increment attempts counter
- \`aiSDK.getUserPublicProfile(userId?)\` - Get user's public profile (if shared)

**Note:** Instance data and user progress schemas are defined by interaction builders in the Data Storage tab. Only fields defined in schemas will be validated.

**Example (Drag & Drop):**
\`\`\`javascript
// On sprite drag end
function onDragEnd(sprite, target) {
  aiSDK.updateState('lastDrag', { sprite, target });
  aiSDK.emitEvent({
    type: 'user-selection',
    data: { spriteId: sprite.id, targetId: target.id, isCorrect: checkCorrect(sprite, target) },
    requiresLLMResponse: true
  });
}

// Handle AI feedback
aiSDK.onResponse((r) => {
  // Response automatically displayed based on metadata
  // Or manually control display:
  if (r.metadata?.showInSnack) {
    aiSDK.showSnack(r.response, r.metadata.snackDuration);
  } else if (r.response) {
    showFeedback(r.response);
  }
});

// Save instance data (anonymous)
await aiSDK.saveInstanceData({
  selectedFragments: [0, 2, 4],
  timeToFirstSelection: 3.5
});

// Save user progress
await aiSDK.saveUserProgress({
  score: 85,
  completed: true,
  customData: {
    difficultyRating: 3
  }
});
\`\`\``,
          placeholder: 'Enter condensed SDK documentation for PixiJS interactions...'
        },
        'sdk-iframe': {
          label: 'SDK Reference: iFrame Interactions',
          content: `## AI Teacher SDK for iFrame Interactions

**Integration:** iFrame interactions embed external websites. Use \`createIframeAISDK()\` to access the AI Teacher.

**Setup:**
\`\`\`javascript
const aiSDK = createIframeAISDK();
aiSDK.isReady((ready) => {
  if (ready) {
    // SDK ready
  }
});
\`\`\`

**Core Methods:**
- \`aiSDK.emitEvent({ type, data, requiresLLMResponse })\` - Send events
- \`aiSDK.updateState(key, value)\` - Update state
- \`aiSDK.onResponse(callback)\` - Receive AI responses
- \`aiSDK.onAction(type, callback)\` - Handle specific actions

**Display Methods:**
- \`aiSDK.postToChat(content, role, openChat)\` - Post message to chat UI
- \`aiSDK.showScript(text, openChat)\` - Display as script block
- \`aiSDK.showSnack(content, duration)\` - Show snack message (returns message ID)
- \`aiSDK.hideSnack()\` - Hide current snack message

**Standard Events:** \`user-selection\`, \`progress-update\`, \`hint-request\`, \`explanation-request\`

**Response Actions:** \`show-hint\`, \`update-ui\`

**Response Display:** AI responses include metadata for display control:
- \`metadata.showInSnack\` - Show in snack message
- \`metadata.snackDuration\` - Snack duration (ms, optional)
- \`metadata.postToChat\` - Also post to chat
- \`metadata.openChatUI\` - Open chat if minimized
- \`metadata.showAsScript\` - Show as script block

**Data Storage Methods:**
- \`aiSDK.saveInstanceData(data)\` - Save anonymous instance data (accessible to builders/admins)
- \`aiSDK.getInstanceDataHistory(filters?)\` - Get historical instance data (builders/admins only)
- \`aiSDK.saveUserProgress({ score, completed, customData, ... })\` - Save user progress
- \`aiSDK.getUserProgress()\` - Get current user's progress
- \`aiSDK.markCompleted()\` - Mark interaction as completed
- \`aiSDK.incrementAttempts()\` - Increment attempts counter
- \`aiSDK.getUserPublicProfile(userId?)\` - Get user's public profile (if shared)

**Note:** iFrame interactions typically use guide URLs/docs for AI context. Events should include relevant interaction data. Instance data and user progress schemas are defined by interaction builders in the Data Storage tab. Only fields defined in schemas will be validated.

**Example:**
\`\`\`javascript
// On user action in iframe
function onUserAction(actionData) {
  aiSDK.emitEvent({
    type: 'user-selection',
    data: actionData,
    requiresLLMResponse: true
  });
}

// Request hint
aiSDK.emitEvent({
  type: 'hint-request',
  data: { context: 'stuck on step 3' },
  requiresLLMResponse: true
});

// Handle AI response
aiSDK.onResponse((r) => {
  // Response automatically displayed based on metadata
  // Or manually control display:
  if (r.metadata?.showInSnack) {
    aiSDK.showSnack(r.response, r.metadata.snackDuration);
  }
});

// Save instance data (anonymous)
await aiSDK.saveInstanceData({
  selectedFragments: [0, 2, 4],
  timeToFirstSelection: 3.5
});

// Save user progress
await aiSDK.saveUserProgress({
  score: 85,
  completed: true,
  customData: {
    difficultyRating: 3
  }
});
\`\`\``,
          placeholder: 'Enter condensed SDK documentation for iFrame interactions...'
        }
      }
    },
    {
      id: 'image-generator',
      name: 'Image Generator',
      icon: '🎨',
      description: 'Generates high-quality educational images based on text descriptions for use in lessons and interactions',
      prompts: {
        'default': {
          label: 'Image Generation Prompt',
          content: 'Loading from database...',
          placeholder: 'Enter the prompt for generating educational images...'
        }
      }
    }
  ];

  loading = false;
  savingAll = false;
  savingPrompt: string | null = null; // Track which individual prompt is being saved
  originalPrompts: Map<string, string> = new Map(); // Store original content for reset
  hardcodedDefaults: Map<string, AIAssistant> = new Map(); // Store hardcoded defaults before database load

  /**
   * Check if a prompt has been changed from its original saved version
   */
  hasPromptChanged(assistant: AIAssistant, promptKey: string): boolean {
    const promptId = `${assistant.id}.${promptKey}`;
    const original = this.originalPrompts.get(promptId);
    const current = assistant.prompts[promptKey]?.content || '';
    return original !== current;
  }

  /**
   * Check if any prompt in the selected assistant has been changed
   */
  hasAnyPromptChanged(): boolean {
    if (!this.selectedAssistant) return false;
    return this.getPromptKeys(this.selectedAssistant).some(key => 
      this.hasPromptChanged(this.selectedAssistant!, key)
    );
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    console.log('[AIPrompts] Component initialized');
    
    // Store hardcoded defaults BEFORE loading from database
    this.assistants.forEach(assistant => {
      const defaultsCopy = JSON.parse(JSON.stringify(assistant)); // Deep copy
      this.hardcodedDefaults.set(assistant.id, defaultsCopy);
    });
    
    await this.loadPromptsFromBackend();
    
    // Check for assistantId in query params
    this.route.queryParams.subscribe(params => {
      const assistantId = params['assistant'];
      if (assistantId) {
        const assistant = this.assistants.find(a => a.id === assistantId);
        if (assistant) {
          this.selectedAssistant = assistant;
          console.log('[AIPrompts] 🔗 Restored selected assistant from URL:', assistantId);
        }
      }
    });
  }

  /**
   * Load prompts from backend and merge with frontend template
   */
  async loadPromptsFromBackend() {
    this.loading = true;
    try {
      const dbPrompts = await this.http.get<any[]>(`${environment.apiUrl}/ai-prompts`).toPromise();
      
      console.log('[AIPrompts] 📥 Loaded prompts from backend:', dbPrompts?.length || 0);
      
      if (dbPrompts && dbPrompts.length > 0) {
        // Update assistant prompts with database content and store originals
        dbPrompts.forEach(dbPrompt => {
          const assistant = this.assistants.find(a => a.id === dbPrompt.assistantId);
          if (assistant) {
            // If prompt exists in hardcoded list, update it
            if (assistant.prompts[dbPrompt.promptKey]) {
              // Only update if database has content (don't overwrite with empty)
              if (dbPrompt.content && dbPrompt.content.trim().length > 0) {
                assistant.prompts[dbPrompt.promptKey].content = dbPrompt.content;
              }
            } else {
              // Add new prompt from database that's not in hardcoded list
              assistant.prompts[dbPrompt.promptKey] = {
                label: dbPrompt.label || dbPrompt.promptKey,
                content: dbPrompt.content,
                placeholder: `Enter the prompt for ${dbPrompt.label || dbPrompt.promptKey}...`
              };
              console.log(`[AIPrompts] ➕ Added new prompt from DB: ${dbPrompt.assistantId}.${dbPrompt.promptKey}`);
            }
            
            // Store original content for reset functionality
            const promptId = `${dbPrompt.assistantId}.${dbPrompt.promptKey}`;
            this.originalPrompts.set(promptId, dbPrompt.content);
            
            console.log(`[AIPrompts] ✓ Updated ${dbPrompt.assistantId}.${dbPrompt.promptKey}`);
          }
        });
      }
    } catch (error) {
      console.error('[AIPrompts] ❌ Failed to load prompts:', error);
      this.toastService.warning('Using default prompts. Database prompts not available.');
    } finally {
      this.loading = false;
    }
  }

  selectAssistant(assistant: AIAssistant) {
    this.selectedAssistant = assistant;
    
    // Update URL with query param to persist selection on refresh
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { assistant: assistant.id },
      queryParamsHandling: 'merge'
    });
  }

  getPromptKeys(assistant: AIAssistant): string[] {
    return Object.keys(assistant.prompts);
  }

  cancelEdit() {
    this.selectedAssistant = null;
    
    // Remove query param when going back
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { assistant: null },
      queryParamsHandling: 'merge'
    });
  }

  async saveIndividualPrompt(assistant: AIAssistant, promptKey: string) {
    if (this.savingPrompt) return;

    this.savingPrompt = promptKey;
    console.log('[AIPrompts] 💾 Saving individual prompt:', `${assistant.id}.${promptKey}`);

    try {
      const prompt = assistant.prompts[promptKey];
      const promptId = `${assistant.id}.${promptKey}`;
      
      await this.http.put(`${environment.apiUrl}/ai-prompts/${promptId}`, {
        content: prompt.content,
        label: prompt.label
      }).toPromise();
      
      // Update stored original
      this.originalPrompts.set(promptId, prompt.content);
      
      console.log('[AIPrompts] ✅ Prompt saved:', promptKey);
      this.toastService.success(`Prompt "${prompt.label}" saved successfully!`, 3000);
    } catch (error: any) {
      console.error('[AIPrompts] ❌ Failed to save prompt:', error);
      this.toastService.error(`Failed to save: ${error?.message || 'Unknown error'}`, 5000);
    } finally {
      this.savingPrompt = null;
    }
  }

  resetPrompt(assistant: AIAssistant, promptKey: string) {
    const promptId = `${assistant.id}.${promptKey}`;
    const original = this.originalPrompts.get(promptId);
    
    if (original) {
      assistant.prompts[promptKey].content = original;
      console.log('[AIPrompts] ↶ Reset prompt to original:', promptKey);
      this.toastService.info(`Reset "${assistant.prompts[promptKey].label}" to last saved version`, 2000);
    }
  }

  resetToLatestDefaults() {
    if (!this.selectedAssistant) return;
    
    if (!confirm('This will reset all prompts to the latest hardcoded defaults. Any unsaved changes will be lost. Continue?')) {
      return;
    }
    
    // Get the hardcoded defaults (stored before database load)
    const defaultAssistant = this.hardcodedDefaults.get(this.selectedAssistant.id);
    if (defaultAssistant) {
      console.log('[AIPrompts] 🔄 Resetting prompts from hardcoded defaults for:', this.selectedAssistant.id);
      
      // Copy fresh defaults to the selected assistant
      Object.keys(defaultAssistant.prompts).forEach(key => {
        if (this.selectedAssistant!.prompts[key]) {
          const oldContent = this.selectedAssistant!.prompts[key].content;
          const newContent = defaultAssistant.prompts[key].content;
          this.selectedAssistant!.prompts[key].content = newContent;
          console.log(`[AIPrompts]   - ${key}: ${oldContent !== newContent ? 'CHANGED' : 'unchanged'} (${newContent.length} chars)`);
        }
      });
      
      // Keep the current originalPrompts (from database) for comparison
      // This way Save buttons will enable if hardcoded defaults differ from database
      
      this.toastService.success('Reset to latest defaults. Click "Save All Changes" to update the database.', 5000);
      console.log('[AIPrompts] ✅ Reset complete');
    } else {
      console.error('[AIPrompts] ❌ Could not find hardcoded defaults for:', this.selectedAssistant.id);
      this.toastService.error('Could not find hardcoded defaults. Please refresh the page.', 3000);
    }
  }

  async saveAllPrompts() {
    if (!this.selectedAssistant || this.savingAll) return;

    console.log('[AIPrompts] 💾 Saving ALL prompts for:', this.selectedAssistant.name);
    this.savingAll = true;

    try {
      const updates = [];
      
      // Save each prompt
      for (const promptKey of Object.keys(this.selectedAssistant.prompts)) {
        const prompt = this.selectedAssistant.prompts[promptKey];
        const promptId = `${this.selectedAssistant.id}.${promptKey}`;
        
        updates.push(
          this.http.put(`${environment.apiUrl}/ai-prompts/${promptId}`, {
            content: prompt.content,
            label: prompt.label
          }).toPromise()
        );
      }
      
      await Promise.all(updates);
      
      console.log('[AIPrompts] ✅ All prompts saved successfully');
      const assistantName = this.selectedAssistant.name;
      
      // Update originalPrompts to reflect saved state (so Save buttons disable)
      Object.keys(this.selectedAssistant.prompts).forEach(key => {
        const promptId = `${this.selectedAssistant!.id}.${key}`;
        this.originalPrompts.set(promptId, this.selectedAssistant!.prompts[key].content);
      });
      
      this.toastService.success(
        'Prompts saved for ' + assistantName + '! Changes will take effect immediately.',
        4000
      );
      
      // Don't navigate away - stay on the same page
      // Keep selectedAssistant so user can continue editing if needed
    } catch (error: any) {
      console.error('[AIPrompts] ❌ Failed to save prompts:', error);
      this.toastService.error('Failed to save prompts: ' + (error?.message || 'Unknown error'), 5000);
    } finally {
      this.savingAll = false;
    }
  }

  goBack() {
    if (this.selectedAssistant) {
      this.selectedAssistant = null;
    } else {
      this.router.navigate(['/super-admin']);
    }
  }
}

