import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { HubsAuthService } from './hubs-auth.service';

/**
 * Handles OIDC SSO login/callback flows for hubs that use external authentication.
 * Flow:
 *  1. Frontend redirects user to GET /auth/hub/:slug/oidc/login
 *  2. This endpoint discovers the OIDC issuer, builds auth URL, redirects user to IdP
 *  3. User authenticates at IdP
 *  4. IdP redirects to GET /auth/hub/:slug/oidc/callback with ?code=...&state=...
 *  5. Backend exchanges code for tokens, extracts user info, creates/finds user, issues JWT
 *  6. Redirects to frontend with ?token=...&hubSlug=...
 */
@Controller('auth/hub')
export class HubsAuthController {
  private readonly logger = new Logger(HubsAuthController.name);

  constructor(private readonly hubsAuthService: HubsAuthService) {}

  /**
   * Initiates the OIDC login flow for a hub.
   * Redirects the user to the hub's configured OIDC provider.
   */
  @Get(':slug/oidc/login')
  async oidcLogin(
    @Param('slug') slug: string,
    @Res() res: express.Response,
  ) {
    try {
      const authUrl = await this.hubsAuthService.getOidcAuthorizationUrl(slug);
      this.logger.log(`[OIDC] Redirecting to IdP for hub: ${slug}`);
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error(`[OIDC] Login initiation failed for hub ${slug}:`, error.message);
      throw new BadRequestException(
        error.message || 'Failed to initiate SSO login. Check hub SSO configuration.',
      );
    }
  }

  /**
   * Handles the OIDC callback after IdP authentication.
   * Exchanges the code for tokens, creates/finds user, redirects to frontend.
   */
  @Get(':slug/oidc/callback')
  async oidcCallback(
    @Param('slug') slug: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oidcError: string,
    @Query('error_description') errorDescription: string,
    @Res() res: express.Response,
  ) {
    // Handle IdP errors
    if (oidcError) {
      this.logger.warn(`[OIDC] IdP returned error for hub ${slug}: ${oidcError} — ${errorDescription}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
      return res.redirect(
        `${frontendUrl}/hubs/${slug}?ssoError=${encodeURIComponent(errorDescription || oidcError)}`,
      );
    }

    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    try {
      const result = await this.hubsAuthService.handleOidcCallback(slug, code, state);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
      this.logger.log(`[OIDC] SSO login successful for hub ${slug}, user: ${result.userId}`);

      // Redirect to frontend with the token
      return res.redirect(
        `${frontendUrl}/hubs/${slug}?ssoToken=${result.token}&ssoUserId=${result.userId}&ssoEmail=${encodeURIComponent(result.email)}&ssoName=${encodeURIComponent(result.name)}`,
      );
    } catch (error) {
      this.logger.error(`[OIDC] Callback failed for hub ${slug}:`, error.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8100';
      return res.redirect(
        `${frontendUrl}/hubs/${slug}?ssoError=${encodeURIComponent(error.message || 'SSO authentication failed')}`,
      );
    }
  }

  /**
   * Returns the SSO configuration status for a hub (public, no secrets exposed).
   */
  @Get(':slug/sso-info')
  async getSsoInfo(@Param('slug') slug: string) {
    return this.hubsAuthService.getPublicSsoInfo(slug);
  }
}
