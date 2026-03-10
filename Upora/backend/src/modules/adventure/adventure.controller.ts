import { Controller, Post, Get, Patch, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AdventureService } from './adventure.service';

@Controller('adventure')
export class AdventureController {
  constructor(private readonly adventureService: AdventureService) {}

  @Post('session')
  async createOrResumeSession(
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.headers['x-user-id'] || 'anonymous';
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';

    if (!body.lessonId) {
      throw new HttpException('lessonId is required', HttpStatus.BAD_REQUEST);
    }

    const session = await this.adventureService.createOrResumeSession(userId, tenantId, body.lessonId);
    return { sessionId: session.id, state: session.adventureState, characterPortraits: session.characterPortraits };
  }

  @Post('generate-scene')
  async generateScene(@Body() body: Record<string, any>) {
    if (!body.sessionId || !body.sceneId) {
      throw new HttpException('sessionId and sceneId are required', HttpStatus.BAD_REQUEST);
    }

    const scene = await this.adventureService.generateScene(body as any);
    return scene;
  }

  @Post('validate-input')
  async validateInput(@Body() body: Record<string, any>) {
    if (!body.sessionId || !body.userInput) {
      throw new HttpException('sessionId and userInput are required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.adventureService.validateInput(body as any);
    return result;
  }

  @Post('prefetch-next')
  async prefetchNext(
    @Body() body: {
      sessionId: string;
      possibleChoices: Array<{ id: string; leadsTo: string; scenePrompt: string }>;
      characters: Array<{ id: string; name: string; description: string }>;
      learningObjectives: string[];
      contentConstraintLevel: 'strict' | 'moderate' | 'open';
      approvedContentSourceIds?: string[];
    },
  ) {
    if (!body.sessionId || !body.possibleChoices?.length) {
      throw new HttpException('sessionId and possibleChoices are required', HttpStatus.BAD_REQUEST);
    }

    // Fire-and-forget prefetch (don't block the response)
    this.adventureService.prefetchNextScenes(
      body.sessionId,
      body.possibleChoices,
      {
        characters: body.characters,
        learningObjectives: body.learningObjectives,
        contentConstraintLevel: body.contentConstraintLevel,
        approvedContentSourceIds: body.approvedContentSourceIds,
      },
    ).catch(err => console.error('Prefetch failed:', err.message));

    return { status: 'prefetching', count: Math.min(body.possibleChoices.length, 3) };
  }

  @Get('session/:id/state')
  async getSessionState(@Param('id') id: string) {
    const session = await this.adventureService.getSession(id);
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    return {
      sessionId: session.id,
      state: session.adventureState,
      sceneCache: session.sceneCache,
      characterPortraits: session.characterPortraits,
    };
  }

  @Patch('session/:id/state')
  async updateSessionState(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const session = await this.adventureService.updateState(id, body);
    return { sessionId: session.id, state: session.adventureState };
  }
}
