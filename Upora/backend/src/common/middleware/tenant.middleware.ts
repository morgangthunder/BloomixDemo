import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from header
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (tenantId) {
      // Store in request for use in services
      (req as any).tenantId = tenantId;
    }
    
    next();
  }
}
