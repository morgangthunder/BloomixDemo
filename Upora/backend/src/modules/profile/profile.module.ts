import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
  imports: [SuperAdminModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
