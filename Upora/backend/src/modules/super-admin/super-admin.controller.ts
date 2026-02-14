import { BadGatewayException, BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UserPersonalizationService } from '../user-personalization/user-personalization.service';
import { MessageDeliverySettingsService } from '../message-delivery-settings/message-delivery-settings.service';
import { N8nApiService, WORKFLOW_PURPOSES } from './n8n-api.service';
import { FeedbackService } from '../feedback/feedback.service';
import { FeedbackStatus } from '../../entities/feedback.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateOnboardingOptionsDto } from './dto/update-onboarding-options.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly userPersonalizationService: UserPersonalizationService,
    private readonly messageDeliverySettingsService: MessageDeliverySettingsService,
    private readonly n8nApiService: N8nApiService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Get('token-usage')
  async getTokenUsage() {
    return this.superAdminService.getTokenUsageDashboard();
  }

  @Get('llm-queries')
  async getRecentLlmQueries(
    @Query('assistant') assistant?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.getRecentLlmQueries(assistant, limit ? parseInt(limit, 10) : 5);
  }

  @Patch('llm-queries/:id/pin')
  async setLlmQueryPinned(
    @Param('id') id: string,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.superAdminService.setLlmQueryPinned(id, !!isPinned);
  }

  @Get('onboarding/popular-selections')
  async getOnboardingPopularSelections() {
    return this.userPersonalizationService.getPopularSelections();
  }

  @Get('onboarding/options')
  async getOnboardingOptions() {
    return this.userPersonalizationService.getAllOptionsForAdmin();
  }

  @Patch('onboarding/options/:category')
  async updateOnboardingOptions(
    @Param('category') category: string,
    @Body() dto: UpdateOnboardingOptionsDto,
  ) {
    const options = Array.isArray(dto.options) ? dto.options : [];
    return this.userPersonalizationService.updateOptions(
      category,
      options,
      dto.ageRange || '',
      dto.gender || '',
    );
  }

  @Delete('onboarding/options/:category')
  async deleteOnboardingOptionsVariant(
    @Param('category') category: string,
    @Query('ageRange') ageRange?: string,
    @Query('gender') gender?: string,
  ) {
    return this.userPersonalizationService.deleteVariant(
      category,
      ageRange || '',
      gender || '',
    );
  }

  @Get('n8n-config')
  async getN8nConfig() {
    const n8nUiUrl = process.env.N8N_UI_URL?.trim() || 'http://localhost:5678';
    try {
      const settings = await this.messageDeliverySettingsService.getSettings();
      const messageWebhookUrl =
        settings.n8nWebhookUrl?.trim() || process.env.N8N_MESSAGES_WEBHOOK_URL?.trim() || null;
      return { n8nUiUrl, messageWebhookUrl };
    } catch (err) {
      // e.g. missing n8n_api_key column if migration not run
      const fallback = process.env.N8N_MESSAGES_WEBHOOK_URL?.trim() || null;
      return { n8nUiUrl, messageWebhookUrl: fallback };
    }
  }

  @Get('message-delivery-settings')
  async getMessageDeliverySettings() {
    try {
      const s = await this.messageDeliverySettingsService.getSettings();
      const out = { ...s };
      (out as any).smtpPassword = (s.smtpPassword && s.smtpPassword.length > 0) ? '********' : null;
      (out as any).n8nApiKey = (s.n8nApiKey && s.n8nApiKey.length > 0) ? '********' : null;
      return out;
    } catch {
      // e.g. missing n8n_api_key column if migration not run – return defaults
      return {
        id: 'default',
        emailDeliveryMethod: 'n8n_webhook',
        n8nWebhookUrl: null,
        emailFromName: null,
        emailFromAddress: null,
        smtpHost: null,
        smtpPort: null,
        smtpSecure: false,
        smtpUser: null,
        smtpPassword: null,
        n8nApiKey: null,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  @Patch('message-delivery-settings')
  async updateMessageDeliverySettings(
    @Body()
    dto: {
      emailDeliveryMethod?: 'smtp' | 'n8n_webhook';
      n8nWebhookUrl?: string | null;
      emailFromName?: string | null;
      emailFromAddress?: string | null;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpSecure?: boolean;
      smtpUser?: string | null;
      smtpPassword?: string | null;
      n8nApiKey?: string | null;
    },
  ) {
    return this.messageDeliverySettingsService.updateSettings(dto);
  }

  @Get('n8n/workflows')
  async listN8nWorkflows() {
    try {
      return await this.n8nApiService.listWorkflows();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'N8N request failed');
    }
  }

  @Get('n8n/workflows/:id')
  async getN8nWorkflow(@Param('id') id: string) {
    return this.n8nApiService.getWorkflow(id);
  }

  @Post('n8n/workflows/:id/activate')
  async activateN8nWorkflow(@Param('id') id: string) {
    await this.n8nApiService.setWorkflowActive(id, true);
    return this.n8nApiService.getWorkflow(id);
  }

  @Post('n8n/workflows/:id/deactivate')
  async deactivateN8nWorkflow(@Param('id') id: string) {
    await this.n8nApiService.setWorkflowActive(id, false);
    return this.n8nApiService.getWorkflow(id);
  }

  @Post('n8n/workflows')
  async createN8nWorkflow(@Body() body: Record<string, unknown>) {
    return this.n8nApiService.createWorkflow(body);
  }

  @Get('n8n/workflow-templates')
  async getN8nWorkflowTemplates() {
    return this.n8nApiService.getWorkflowTemplates();
  }

  @Post('n8n/workflows/import')
  async importN8nWorkflowTemplate(@Body('template') template: string) {
    if (!template || typeof template !== 'string') {
      throw new BadRequestException('template is required');
    }
    try {
      return await this.n8nApiService.importWorkflowTemplate(template.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Import failed');
    }
  }

  @Post('n8n/workflows/import-json')
  async importN8nWorkflowFromJson(@Body('json') json: string) {
    if (!json || typeof json !== 'string') {
      throw new BadRequestException('json is required');
    }
    try {
      return await this.n8nApiService.importWorkflowFromJson(json.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Import failed');
    }
  }

  @Delete('n8n/workflows/:id')
  async deleteN8nWorkflow(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Workflow id is required');
    }
    try {
      await this.n8nApiService.deleteWorkflow(id);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Failed to delete workflow');
    }
  }

  // ── Legacy endpoint (kept for backward compat) ──
  @Post('n8n/use-webhook-for-messages')
  async useN8nWebhookForMessages(@Body('webhookUrl') webhookUrl: string) {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      throw new BadRequestException('webhookUrl is required');
    }
    await this.messageDeliverySettingsService.updateSettings({
      n8nWebhookUrl: webhookUrl.trim(),
      emailDeliveryMethod: 'n8n_webhook',
    });
    return { ok: true, messageWebhookUrl: webhookUrl.trim() };
  }

  // ── Workflow purpose assignments ──────────────────────────────────────

  /** List available purposes and current assignments. */
  @Get('n8n/workflow-purposes')
  async getWorkflowPurposes() {
    const assignments = await this.messageDeliverySettingsService.getPurposeAssignments();
    return {
      purposes: WORKFLOW_PURPOSES,
      assignments,
    };
  }

  /** Assign a workflow to a purpose. */
  @Post('n8n/workflow-purposes/assign')
  async assignWorkflowPurpose(
    @Body('purposeKey') purposeKey: string,
    @Body('workflowId') workflowId: string,
    @Body('webhookUrl') webhookUrl: string,
    @Body('workflowName') workflowName: string,
  ) {
    if (!purposeKey || typeof purposeKey !== 'string') {
      throw new BadRequestException('purposeKey is required');
    }
    if (!WORKFLOW_PURPOSES.some((p) => p.key === purposeKey)) {
      throw new BadRequestException(`Unknown purpose: ${purposeKey}. Valid: ${WORKFLOW_PURPOSES.map((p) => p.key).join(', ')}`);
    }
    if (!workflowId || !webhookUrl) {
      throw new BadRequestException('workflowId and webhookUrl are required');
    }
    const assignments = await this.messageDeliverySettingsService.assignPurpose(purposeKey, {
      workflowId,
      webhookUrl: webhookUrl.trim(),
      workflowName: workflowName || '',
      assignedAt: new Date().toISOString(),
    });
    return { ok: true, assignments };
  }

  /** Unassign a workflow from a purpose. */
  @Post('n8n/workflow-purposes/unassign')
  async unassignWorkflowPurpose(@Body('purposeKey') purposeKey: string) {
    if (!purposeKey || typeof purposeKey !== 'string') {
      throw new BadRequestException('purposeKey is required');
    }
    const assignments = await this.messageDeliverySettingsService.unassignPurpose(purposeKey);
    return { ok: true, assignments };
  }

  @Get('n8n/community-nodes')
  async listInstalledCommunityNodes() {
    try {
      const nodes = await this.n8nApiService.listInstalledCommunityNodes();
      // Get details for each node
      const nodesWithInfo = await Promise.all(
        nodes.map(async (pkg) => {
          const info = await this.n8nApiService.getNodeInfo(pkg);
          return {
            packageName: pkg,
            ...info,
          };
        }),
      );
      return nodesWithInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Failed to list community nodes');
    }
  }

  @Get('n8n/community-nodes/search')
  async searchNodes(@Query('q') q: string) {
    try {
      const query = typeof q === 'string' ? q.trim() : '';
      const nodes = await this.n8nApiService.searchNodes(query, 25);
      return nodes;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Search failed');
    }
  }

  @Get('n8n/community-nodes/popular')
  async getPopularNodes() {
    try {
      const nodes = await this.n8nApiService.fetchPopularNodes(50);
      return nodes;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Failed to fetch popular nodes');
    }
  }

  @Get('n8n/community-nodes/resolved-type')
  async getResolvedNodeType(@Query('package') packageName: string) {
    if (!packageName || typeof packageName !== 'string') {
      throw new BadRequestException('Query "package" is required (e.g. ?package=n8n-nodes-sendmail)');
    }
    try {
      const resolvedType = await this.n8nApiService.getResolvedNodeType(packageName.trim());
      return { resolvedType: resolvedType ?? null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Failed to resolve node type');
    }
  }

  @Post('n8n/community-nodes/install')
  async installCommunityNode(@Body('packageName') packageName: string) {
    if (!packageName || typeof packageName !== 'string') {
      throw new BadRequestException('packageName is required');
    }
    try {
      const result = await this.n8nApiService.installCommunityNode(packageName.trim());
      const message =
        result.message ||
        (result.success
          ? `Successfully installed ${packageName}. Please restart N8N for the node to appear.`
          : result.manualCommand
            ? 'Docker is not available from the backend. Run the command below in your terminal.'
            : result.error || 'Installation failed. Check the error message below.');
      return {
        success: result.success,
        message,
        alreadyInstalled: result.alreadyInstalled,
        output: result.output,
        error: result.error,
        manualCommand: result.manualCommand,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(message || 'Failed to install community node');
    }
  }

  // ── Feedback management ───────────────────────────────────────────────

  @Get('feedback')
  async getAllFeedback() {
    return this.feedbackService.getAllFeedback(false);
  }

  @Get('feedback/archived')
  async getArchivedFeedback() {
    return this.feedbackService.getArchivedFeedback();
  }

  @Get('feedback/settings')
  async getFeedbackSettings() {
    const settings = await this.messageDeliverySettingsService.getSettings();
    return { feedbackEnabledByDefault: settings.feedbackEnabledByDefault ?? true };
  }

  @Patch('feedback/settings')
  async updateFeedbackSettings(@Body('feedbackEnabledByDefault') enabled: boolean) {
    await this.messageDeliverySettingsService.updateSettings({ feedbackEnabledByDefault: enabled } as any);
    return { ok: true, feedbackEnabledByDefault: enabled };
  }

  @Get('feedback/user/:userId')
  async getFeedbackForUser(@Param('userId') userId: string) {
    return this.feedbackService.getFeedbackForUser(userId);
  }

  @Get('feedback/:id/thread')
  async getFeedbackThread(@Param('id') id: string) {
    return this.feedbackService.getFeedbackThread(id);
  }

  @Post('feedback/:id/reply')
  async replyToFeedback(@Param('id') id: string, @Body('body') body: string, @Body('sendEmail') sendEmail: boolean, @Req() req: any) {
    const uid = req.user?.userId || req.user?.sub;
    return this.feedbackService.replyToFeedback(id, uid, body, !!sendEmail);
  }

  @Patch('feedback/:id/status')
  async updateFeedbackStatus(@Param('id') id: string, @Body('status') status: string) {
    const validStatuses = Object.values(FeedbackStatus);
    if (!validStatuses.includes(status as FeedbackStatus)) {
      throw new BadRequestException(`Invalid status. Valid: ${validStatuses.join(', ')}`);
    }
    return this.feedbackService.updateStatus(id, status as FeedbackStatus);
  }

  @Patch('users/:userId/feedback-enabled')
  async toggleUserFeedback(@Param('userId') userId: string, @Body('enabled') enabled: boolean) {
    await this.feedbackService.toggleUserFeedback(userId, enabled);
    return { ok: true, feedbackEnabled: enabled };
  }
}

