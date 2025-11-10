import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { User } from './entities/user.entity';
import { Lesson } from './entities/lesson.entity';
import { InteractionType } from './entities/interaction-type.entity';
import { Workflow } from './entities/workflow.entity';
import { Usage } from './entities/usage.entity';
import { ContentSource } from './entities/content-source.entity';
import { LessonDataLink } from './entities/lesson-data-link.entity';
import { ProcessedContentOutput } from './entities/processed-content-output.entity';
import { ScriptBlock } from './entities/script-block.entity';
import { Course } from './entities/course.entity';
import { UsersModule } from './modules/users/users.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContentSourcesModule } from './modules/content-sources/content-sources.module';
import { LessonEditorModule } from './modules/lesson-editor/lesson-editor.module';
import { InteractionTypesModule } from './modules/interaction-types/interaction-types.module';
import { WeaviateModule } from './services/weaviate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [User, Lesson, InteractionType, Workflow, Usage, ContentSource, LessonDataLink, ProcessedContentOutput, ScriptBlock, Course],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
    }),
    WeaviateModule, // Global module with WeaviateService
    UsersModule,
    LessonsModule,
    ChatModule,
    ContentSourcesModule,
    LessonEditorModule,
    InteractionTypesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}