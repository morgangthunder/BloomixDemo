import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'upora_user',
  password: process.env.DATABASE_PASSWORD || 'upora_password',
  database: process.env.DATABASE_NAME || 'upora_dev',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // Disable auto-sync when using SQL init scripts
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.DATABASE_LOGGING === 'true',
}));
