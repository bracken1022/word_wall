import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AIService } from './ai.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'word-processing',
    }),
  ],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}