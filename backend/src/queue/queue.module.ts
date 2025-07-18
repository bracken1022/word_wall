import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WordProcessingConsumer } from './word-processing.consumer';
import { AIModule } from '../ai/ai.module';
import { WordModule } from '../word/word.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'word-processing',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3, // Reduce from default 20 to fail faster
        enableReadyCheck: false,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 5000, // 5 second timeout
        commandTimeout: 3000, // 3 second command timeout
        // For development, use local Redis
        // For production, you might want to use ElastiCache or another Redis service
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    AIModule,
    WordModule,
  ],
  providers: [WordProcessingConsumer],
  exports: [BullModule],
})
export class QueueModule {}