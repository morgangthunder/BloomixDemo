import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  
  // Enable CORS for frontend (including WebSocket)
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:8100'];
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Global prefix for all API routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  // ========================================
  // 🔥 BACKEND VERSION 0.0.6 🔥
  // ========================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔥🔥🔥 BACKEND VERSION 0.0.6 STARTED 🔥🔥🔥');
  console.log('🔧 Two-step content flow: URL → source → processed output');
  console.log(`🚀 API running on: http://localhost:${port}/api`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}
bootstrap();