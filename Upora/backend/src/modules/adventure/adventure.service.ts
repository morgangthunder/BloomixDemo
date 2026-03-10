import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdventureSession } from '../../entities/adventure-session.entity';
import { GrokService } from '../../services/grok.service';
import { WeaviateService } from '../../services/weaviate.service';

export interface GenerateSceneRequest {
  sessionId: string;
  sceneId: string;
  phaseId: string;
  scenePrompt: string;
  characters: Array<{ id: string; name: string; description: string }>;
  learningObjectives: string[];
  contentConstraintLevel: 'strict' | 'moderate' | 'open';
  approvedContentSourceIds?: string[];
  previousChoice?: { label: string; tags?: string[] };
}

export interface GenerateSceneResponse {
  narrative: string;
  imagePrompt: string;
  choices: Array<{ id: string; label: string; leadsTo: string; tags?: string[] }>;
  characters: Array<{ id: string; expression: string; position: 'left' | 'right' }>;
  clickableObjects?: Array<{ label: string; action: string; targetInteractionId?: string; characterId?: string; chatOpener?: string }>;
  educationalContent?: string;
}

export interface ValidateInputRequest {
  sessionId: string;
  userInput: string;
  learningObjectives: string[];
  currentPuzzleContext: string;
  approvedContentSourceIds?: string[];
}

export interface ValidateInputResponse {
  valid: boolean;
  reason?: string;
  hint?: string;
  educationalNote?: string;
  correctedInput?: string;
}

@Injectable()
export class AdventureService {
  private readonly logger = new Logger('AdventureService');

  constructor(
    @InjectRepository(AdventureSession)
    private sessionRepository: Repository<AdventureSession>,
    private grokService: GrokService,
    private weaviateService: WeaviateService,
  ) {}

  async createOrResumeSession(
    userId: string,
    tenantId: string,
    lessonId: string,
  ): Promise<AdventureSession> {
    let session = await this.sessionRepository.findOne({
      where: { userId, tenantId, lessonId },
      order: { updatedAt: 'DESC' },
    });

    if (session) {
      this.logger.log(`Resuming adventure session ${session.id} for lesson ${lessonId}`);
      return session;
    }

    session = this.sessionRepository.create({
      userId,
      tenantId,
      lessonId,
      adventureState: {
        inventory: {},
        choices: [],
        score: 0,
        health: 100,
        flags: {},
        history: [],
      },
      sceneCache: {},
      characterPortraits: {},
    });

    session = await this.sessionRepository.save(session);
    this.logger.log(`Created new adventure session ${session.id} for lesson ${lessonId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<AdventureSession | null> {
    return this.sessionRepository.findOne({ where: { id: sessionId } });
  }

  async updateState(
    sessionId: string,
    stateUpdate: Partial<AdventureSession['adventureState']>,
  ): Promise<AdventureSession> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new Error(`Adventure session not found: ${sessionId}`);

    session.adventureState = { ...session.adventureState, ...stateUpdate };
    return this.sessionRepository.save(session);
  }

  async generateScene(request: GenerateSceneRequest): Promise<GenerateSceneResponse> {
    const session = await this.sessionRepository.findOne({ where: { id: request.sessionId } });
    if (!session) throw new Error(`Adventure session not found: ${request.sessionId}`);

    // Fetch RAG content if approved sources are provided
    let ragContext = '';
    if (request.approvedContentSourceIds?.length) {
      try {
        const results = await this.weaviateService.searchByContentSourceIds(
          request.learningObjectives.join(' '),
          request.approvedContentSourceIds,
          session.tenantId,
          5,
        );
        ragContext = results.map((r: any) => r.summary || r.fullText || '').join('\n---\n');
      } catch (err) {
        this.logger.warn(`Weaviate search failed for adventure scene: ${err.message}`);
      }
    }

    const constraintInstructions = this.buildConstraintInstructions(request.contentConstraintLevel, ragContext);

    const choiceHistory = session.adventureState.choices
      .map(c => `- Phase "${c.phaseId}": chose "${c.label}"`)
      .join('\n');

    const characterDescriptions = request.characters
      .map(c => `${c.name}: ${c.description}`)
      .join('\n');

    const systemPrompt = `You are a creative educational storyteller. You generate immersive, branching narrative scenes for educational adventures.

SETTING CONTEXT:
${request.scenePrompt}

CHARACTERS:
${characterDescriptions}

LEARNING OBJECTIVES:
${request.learningObjectives.map(o => `- ${o}`).join('\n')}

${constraintInstructions}

PLAYER HISTORY:
${choiceHistory || 'This is the beginning of the adventure.'}
${request.previousChoice ? `\nThe player just chose: "${request.previousChoice.label}"` : ''}

RULES:
1. Write engaging, age-appropriate narrative (2-4 paragraphs).
2. Include dialogue for characters present in the scene.
3. End with 2-4 choices that branch the story while keeping learning objectives intact.
4. Suggest an image prompt for the scene background (descriptive, no text).
5. Indicate character expressions and positions.
6. If relevant, suggest clickable objects in the scene image.

Respond ONLY with valid JSON (no markdown fences):
{
  "narrative": "...",
  "imagePrompt": "...",
  "choices": [{ "id": "choice-1", "label": "...", "leadsTo": "next-interaction-id", "tags": [] }],
  "characters": [{ "id": "character-id", "expression": "neutral|happy|angry|surprised|sad", "position": "left|right" }],
  "clickableObjects": [{ "label": "object name", "action": "chat|navigate|event|inspect", "targetInteractionId": "...", "characterId": "...", "chatOpener": "..." }],
  "educationalContent": "Key educational facts woven into this scene"
}`;

    try {
      const response = await this.grokService.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the next scene for phase "${request.phaseId}".` },
        ],
        temperature: 0.8,
        maxTokens: 2000,
      });

      const parsed = this.parseJsonResponse(response.content);

      // Cache the generated scene
      session.sceneCache[request.sceneId] = {
        ...parsed,
        generatedAt: new Date().toISOString(),
      };

      // Update history
      session.adventureState.history.push({
        phaseId: request.phaseId,
        sceneText: parsed.narrative?.substring(0, 200) || '',
        timestamp: new Date().toISOString(),
      });

      if (request.previousChoice) {
        session.adventureState.choices.push({
          phaseId: request.phaseId,
          choiceId: request.previousChoice.label,
          label: request.previousChoice.label,
          timestamp: new Date().toISOString(),
        });
      }

      session.adventureState.currentPhaseId = request.phaseId;
      await this.sessionRepository.save(session);

      return parsed;
    } catch (err) {
      this.logger.error(`Scene generation failed: ${err.message}`);
      return {
        narrative: 'The adventure continues... (Scene generation encountered an issue. Please try again.)',
        imagePrompt: 'A mysterious landscape with dramatic lighting',
        choices: [{ id: 'retry', label: 'Continue forward', leadsTo: request.sceneId, tags: [] }],
        characters: [],
      };
    }
  }

  async validateInput(request: ValidateInputRequest): Promise<ValidateInputResponse> {
    let ragContext = '';
    if (request.approvedContentSourceIds?.length) {
      try {
        const session = await this.sessionRepository.findOne({ where: { id: request.sessionId } });
        const results = await this.weaviateService.searchByContentSourceIds(
          request.currentPuzzleContext,
          request.approvedContentSourceIds,
          session?.tenantId || '',
          3,
        );
        ragContext = results.map((r: any) => r.summary || r.fullText || '').join('\n---\n');
      } catch (err) {
        this.logger.warn(`Weaviate search failed for validation: ${err.message}`);
      }
    }

    const systemPrompt = `You are an educational content validator. Your job is to check if a student's answer is educationally valid.

PUZZLE CONTEXT:
${request.currentPuzzleContext}

LEARNING OBJECTIVES:
${request.learningObjectives.map(o => `- ${o}`).join('\n')}

${ragContext ? `APPROVED REFERENCE CONTENT:\n${ragContext}` : ''}

Check the student's input. Respond ONLY with valid JSON:
{
  "valid": true/false,
  "reason": "Why it's valid or invalid",
  "hint": "A helpful hint if invalid (in-character, encouraging)",
  "educationalNote": "The correct educational concept"
}`;

    try {
      const response = await this.grokService.chatCompletion(
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Student input: "${request.userInput}"` },
          ],
          temperature: 0.3,
          maxTokens: 500,
        },
        { role: 'validator' },
      );

      return this.parseJsonResponse(response.content);
    } catch (err) {
      this.logger.error(`Validation failed: ${err.message}`);
      return { valid: true, reason: 'Validation service unavailable, allowing input' };
    }
  }

  async prefetchNextScenes(
    sessionId: string,
    possibleChoices: Array<{ id: string; leadsTo: string; scenePrompt: string }>,
    request: Omit<GenerateSceneRequest, 'sessionId' | 'sceneId' | 'phaseId' | 'scenePrompt' | 'previousChoice'>,
  ): Promise<void> {
    for (const choice of possibleChoices.slice(0, 3)) {
      try {
        await this.generateScene({
          ...request,
          sessionId,
          sceneId: choice.leadsTo,
          phaseId: choice.leadsTo,
          scenePrompt: choice.scenePrompt,
          previousChoice: { label: choice.id },
        });
        this.logger.log(`Prefetched scene: ${choice.leadsTo}`);
      } catch (err) {
        this.logger.warn(`Prefetch failed for ${choice.leadsTo}: ${err.message}`);
      }
    }
  }

  private buildConstraintInstructions(level: string, ragContext: string): string {
    switch (level) {
      case 'strict':
        return `EDUCATIONAL CONSTRAINTS (STRICT):
You MUST only use formulas, facts, and concepts from the following approved content. Do not introduce any external knowledge.
---
${ragContext || 'No approved content provided.'}
---`;
      case 'moderate':
        return `EDUCATIONAL CONSTRAINTS (MODERATE):
Use the following approved content as your PRIMARY source. You may supplement with general knowledge but prioritize approved material.
---
${ragContext || 'No approved content provided.'}
---`;
      default:
        return ragContext
          ? `REFERENCE CONTENT (for context):\n${ragContext}`
          : '';
    }
  }

  private parseJsonResponse(content: string): any {
    try {
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn('Failed to parse JSON response, attempting extraction');
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
      }
      return { narrative: content, imagePrompt: '', choices: [], characters: [] };
    }
  }
}
