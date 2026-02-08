import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/**
 * Optional JWT Auth Guard.
 * - When AUTH_PROVIDER=none or mock: Uses x-user-id, x-tenant-id, x-user-role headers (for dev).
 * - Otherwise: Validates JWT via Cognito JWKS. Falls back to headers if no Bearer token (gradual migration).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authProvider = this.configService.get<string>('AUTH_PROVIDER', 'none');
    const cognitoPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID', '');

    // Mock/none mode: use headers for dev
    const isMockMode =
      authProvider === 'none' ||
      authProvider === 'mock' ||
      !cognitoPoolId ||
      cognitoPoolId === 'mock-pool-id';

    if (isMockMode) {
      return this.allowWithHeaders(request);
    }

    // Cognito mode: try JWT first
    const authHeader = request.headers.authorization;
    const hasBearer = authHeader?.startsWith('Bearer ');

    if (!hasBearer) {
      // No token - fallback to headers for gradual migration (or deny in strict mode)
      const strictAuth = this.configService.get<string>('STRICT_AUTH', 'false') === 'true';
      if (strictAuth) {
        throw new UnauthorizedException('Bearer token required');
      }
      return this.allowWithHeaders(request);
    }

    try {
      const result = await super.canActivate(context);
      return !!result;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private allowWithHeaders(request: Request): boolean {
    const userId = (request.headers['x-user-id'] as string) || '';
    const tenantId = (request.headers['x-tenant-id'] as string) || '';
    const role = (request.headers['x-user-role'] as string) || 'student';
    const email = (request.headers['x-user-email'] as string) || '';

    (request as any).user = {
      userId,
      tenantId,
      role,
      email: email || (userId?.includes('@') ? userId : undefined),
    };
    return true;
  }
}
