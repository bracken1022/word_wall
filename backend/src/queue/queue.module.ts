import { Module, OnModuleInit } from '@nestjs/common';
import { WordProcessingConsumer } from './word-processing.consumer';
import { SimpleQueueService } from './simple-queue.service';
import { AIModule } from '../ai/ai.module';
import { WordModule } from '../word/word.module';
import { AIService } from '../ai/ai.service';

@Module({
  imports: [
    AIModule,
    WordModule,
  ],
  providers: [WordProcessingConsumer, SimpleQueueService],
  exports: [SimpleQueueService],
})
export class QueueModule implements OnModuleInit {
  constructor(
    private readonly aiService: AIService,
    private readonly simpleQueueService: SimpleQueueService,
    private readonly wordProcessingConsumer: WordProcessingConsumer,
  ) {}

  onModuleInit() {
    // Inject the queue service into the AI service after module initialization
    this.aiService.setQueueService(this.simpleQueueService);
    
    // Set the word processing consumer in the queue service
    this.simpleQueueService.setWordProcessingConsumer(this.wordProcessingConsumer);
  }
}