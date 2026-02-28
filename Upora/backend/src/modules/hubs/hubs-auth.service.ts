import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hub, HubStatus } from '../../entities/hub.entity';
import { HubMember, HubMemberRole, HubMemberStatus } from '../../entities/hub-member.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/approval-status.enum';
import * as crypto from 'crypto';

// openid-client is CJS-compatible at v5
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Issuer, generators } = require('openid-client');

export interface HubAuthConfig {
  provider: 'upora' | 'oidc';
  oidcIssuerUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  emailClaim?: string;   // default 'email'
  nameClaim?: string;    // default 'name'
  scopes?: string;       // default 'openid email profile'
}

interface OidcCallbackResult {
  token: string;
  userId: string;
  email: string;
  name: string;
}

// In-memory state store (for prototype; production would use Redis)
const pendingStates = new Map<string, { hubSlug: string; createdAt: number }>();

@Injectable()
export class HubsAuthService {
  private readonly logger = new Logger(HubsAuthService.name);

  constructor(
    @InjectRepository(Hub) private readonly hubRepo: Repository<Hub>,
    @InjectRepository(HubMember) private readonly memberRepo: Repository<HubMember>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    // Clean up stale states every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of pendingStates.entries()) {
        if (now - val.createdAt > 10 * 60 * 1000) {
          pendingStates.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Build the OIDC authorization URL for a hub and redirect.
   */
  async getOidcAuthorizationUrl(slug: string): Promise<string> {
    const hub = await this.getActiveHub(slug);
    const authConfig = this.getAuthConfig(hub);

    if (authConfig.provider !== 'oidc') {
      throw new BadRequestException('This hub does not use external SSO');
    }

    if (!authConfig.oidcIssuerUrl || !authConfig.oidcClientId) {
      throw new BadRequestException('Hub SSO is not fully configured (missing issuer URL or client ID)');
    }

    // Discover the OIDC issuer
    const issuer = await Issuer.discover(authConfig.oidcIssuerUrl);
    this.logger.log(`[OIDC] Discovered issuer: ${issuer.issuer}`);

    const callbackUrl = this.getCallbackUrl(slug);
    const client = new issuer.Client({
      client_id: authConfig.oidcClientId,
      client_secret: authConfig.oidcClientSecret || undefined,
      redirect_uris: [callbackUrl],
      response_types: ['code'],
    });

    // Generate state for CSRF protection
    const state = generators.state();
    pendingStates.set(state, { hubSlug: slug, createdAt: Date.now() });

    const scopes = authConfig.scopes || 'openid email profile';

    const authUrl = client.authorizationUrl({
      scope: scopes,
      state,
      redirect_uri: callbackUrl,
    });

    return authUrl;
  }

  /**
   * Handle the OIDC callback: exchange code, extract user info, create/find user.
   */
  async handleOidcCallback(
    slug: string,
    code: string,
    state: string,
  ): Promise<OidcCallbackResult> {
    // Validate state
    const pendingState = pendingStates.get(state);
    if (!pendingState || pendingState.hubSlug !== slug) {
      throw new BadRequestException('Invalid or expired SSO state. Please try logging in again.');
    }
    pendingStates.delete(state);

    const hub = await this.getActiveHub(slug);
    const authConfig = this.getAuthConfig(hub);

    if (authConfig.provider !== 'oidc') {
      throw new BadRequestException('This hub does not use external SSO');
    }

    // Discover and create client
    const issuer = await Issuer.discover(authConfig.oidcIssuerUrl);
    const callbackUrl = this.getCallbackUrl(slug);
    const client = new issuer.Client({
      client_id: authConfig.oidcClientId,
      client_secret: authConfig.oidcClientSecret || undefined,
      redirect_uris: [callbackUrl],
      response_types: ['code'],
    });

    // Exchange code for tokens
    const tokenSet = await client.callback(callbackUrl, { code, state }, { state });

    // Get user info from ID token claims or userinfo endpoint
    const claims = tokenSet.claims();
    let userinfo = claims;

    // If claims don't have email, try the userinfo endpoint
    const emailClaim = authConfig.emailClaim || 'email';
    const nameClaim = authConfig.nameClaim || 'name';

    if (!userinfo[emailClaim]) {
      try {
        userinfo = await client.userinfo(tokenSet.access_token);
      } catch (e) {
        this.logger.warn(`[OIDC] Failed to fetch userinfo: ${e.message}`);
      }
    }

    const email = (userinfo[emailClaim] as string) || '';
    const name = (userinfo[nameClaim] as string) || email.split('@')[0] || 'SSO User';
    const sub = claims.sub; // The unique subject identifier from the IdP

    if (!email) {
      throw new BadRequestException(
        'SSO provider did not return an email address. Check the email claim configuration.',
      );
    }

    if (!sub) {
      throw new BadRequestException('SSO provider did not return a subject identifier.');
    }

    // Find or create the SSO user
    const authProviderKey = `oidc:${hub.id}`;
    const user = await this.findOrCreateSsoUser(hub, authProviderKey, sub, email, name);

    // Ensure user is a hub member
    await this.ensureHubMembership(hub.id, user.id);

    // Issue a simple JWT-like token (for prototype; production would use proper JWT signing)
    const token = this.issueToken(user, hub);

    return {
      token,
      userId: user.id,
      email: user.email,
      name: user.username || name,
    };
  }

  /**
   * Returns public SSO info for the frontend (no secrets).
   */
  async getPublicSsoInfo(slug: string): Promise<{
    provider: string;
    ssoEnabled: boolean;
    ssoLoginUrl: string | null;
    issuerUrl: string | null;
  }> {
    const hub = await this.hubRepo.findOne({ where: { slug, status: HubStatus.ACTIVE } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);

    const authConfig = this.getAuthConfig(hub);
    const isOidc = authConfig.provider === 'oidc' && !!authConfig.oidcIssuerUrl && !!authConfig.oidcClientId;

    const backendUrl = process.env.API_URL || 'http://localhost:3000/api';
    return {
      provider: authConfig.provider || 'upora',
      ssoEnabled: isOidc,
      ssoLoginUrl: isOidc ? `${backendUrl}/auth/hub/${slug}/oidc/login` : null,
      issuerUrl: isOidc ? authConfig.oidcIssuerUrl || null : null,
    };
  }

  // ═══════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════

  private getAuthConfig(hub: Hub): HubAuthConfig {
    const raw = hub.authConfig || {};
    return {
      provider: raw.provider || 'upora',
      oidcIssuerUrl: raw.oidcIssuerUrl,
      oidcClientId: raw.oidcClientId,
      oidcClientSecret: raw.oidcClientSecret,
      emailClaim: raw.emailClaim || 'email',
      nameClaim: raw.nameClaim || 'name',
      scopes: raw.scopes || 'openid email profile',
    };
  }

  private async getActiveHub(slug: string): Promise<Hub> {
    const hub = await this.hubRepo.findOne({ where: { slug, status: HubStatus.ACTIVE } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);
    return hub;
  }

  private getCallbackUrl(slug: string): string {
    const backendUrl = process.env.API_URL || 'http://localhost:3000/api';
    return `${backendUrl}/auth/hub/${slug}/oidc/callback`;
  }

  /**
   * Find an existing SSO user or create a new one.
   * SSO users are scoped to their hub — they cannot be Cognito users.
   */
  private async findOrCreateSsoUser(
    hub: Hub,
    authProvider: string,
    sub: string,
    email: string,
    name: string,
  ): Promise<User> {
    // Look up by auth_provider + auth_provider_sub (exact SSO identity)
    let user = await this.userRepo.findOne({
      where: { authProvider, authProviderSub: sub },
    });

    if (user) {
      this.logger.log(`[OIDC] Found existing SSO user: ${user.id} (${user.email})`);
      return user;
    }

    // Check if email is already used by a Cognito user
    const existingCognito = await this.userRepo.findOne({
      where: { email, authProvider: 'cognito' },
    });
    if (existingCognito) {
      // Email is used by a Cognito account — SSO users get a hub-scoped email
      this.logger.warn(
        `[OIDC] Email ${email} already belongs to Cognito user ${existingCognito.id}. Creating hub-scoped user.`,
      );
      // Use a hub-scoped email to avoid unique constraint conflict
      email = `${sub}@hub-${hub.slug}.sso`;
    }

    // Check if email is used by another hub's SSO user
    const existingOther = await this.userRepo.findOne({ where: { email } });
    if (existingOther && existingOther.authProvider !== authProvider) {
      email = `${sub}@hub-${hub.slug}.sso`;
    }

    // Create new SSO user
    user = this.userRepo.create({
      email,
      username: name,
      tenantId: hub.tenantId,
      role: UserRole.STUDENT,
      authProvider,
      authProviderSub: sub,
      feedbackEnabled: false,
    });
    const saved = await this.userRepo.save(user);
    this.logger.log(`[OIDC] Created new SSO user: ${saved.id} (${saved.email}) for hub ${hub.slug}`);
    return saved;
  }

  /**
   * Ensure the SSO user is a joined member of the hub.
   */
  private async ensureHubMembership(hubId: string, userId: string): Promise<void> {
    const existing = await this.memberRepo.findOne({
      where: { hubId, userId },
    });
    if (existing) {
      if (existing.status !== HubMemberStatus.JOINED) {
        existing.status = HubMemberStatus.JOINED;
        existing.joinedAt = new Date();
        await this.memberRepo.save(existing);
      }
      return;
    }

    const member = this.memberRepo.create({
      hubId,
      userId,
      role: HubMemberRole.MEMBER,
      status: HubMemberStatus.JOINED,
      joinedAt: new Date(),
    });
    await this.memberRepo.save(member);
  }

  /**
   * Issue a simple token for the SSO user.
   * For prototype: base64-encoded JSON. Production would use proper JWT with RS256.
   */
  private issueToken(user: User, hub: Hub): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      hubId: hub.id,
      hubSlug: hub.slug,
      tenantId: hub.tenantId,
      authProvider: user.authProvider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24h
    };
    // Simple base64 token for prototype (not cryptographically secure — production needs JWT)
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }
}
