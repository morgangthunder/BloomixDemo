import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    const region = configService.get<string>('COGNITO_REGION', 'us-east-1');
    const userPoolId = configService.get<string>('COGNITO_USER_POOL_ID', '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      }),
      algorithms: ['RS256'],
      audience: configService.get<string>('COGNITO_CLIENT_ID'),
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    });
  }

  async validate(payload: Record<string, any>) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      userId: payload.sub,
      tenantId: payload['custom:tenantId'] || payload['custom:tenant_id'],
      role: payload['custom:role'] || payload['cognito:groups']?.[0] || 'student',
      email: payload.email || payload['cognito:username'],
    };
  }
}
