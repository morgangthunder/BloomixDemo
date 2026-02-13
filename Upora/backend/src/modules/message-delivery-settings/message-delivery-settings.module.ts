import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageDeliverySettings } from '../../entities/message-delivery-settings.entity';
import { MessageDeliverySettingsService } from './message-delivery-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([MessageDeliverySettings])],
  providers: [MessageDeliverySettingsService],
  exports: [MessageDeliverySettingsService],
})
export class MessageDeliverySettingsModule {}
