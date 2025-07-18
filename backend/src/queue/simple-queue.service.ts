import { Injectable, Logger } from '@nestjs/common';

interface QueueJob {
  id: string;
  name: string;
  data: any;
  attempts: number;
  createdAt: Date;
  processing: boolean;
}

@Injectable()
export class SimpleQueueService {
  private readonly logger = new Logger(SimpleQueueService.name);
  private jobs: QueueJob[] = [];
  private processing = false;
  private wordProcessingConsumer: any;

  constructor() {
    // Start processing jobs immediately
    this.startProcessing();
  }

  setWordProcessingConsumer(consumer: any) {
    this.wordProcessingConsumer = consumer;
  }

  async add(jobName: string, data: any, options: any = {}): Promise<void> {
    const job: QueueJob = {
      id: this.generateId(),
      name: jobName,
      data,
      attempts: 0,
      createdAt: new Date(),
      processing: false
    };

    this.jobs.push(job);
    this.logger.log(`Added job "${jobName}" to queue. Queue size: ${this.jobs.length}`);

    // Trigger processing
    this.processJobs();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async startProcessing(): Promise<void> {
    this.logger.log('Simple queue service started');
    // Process jobs every 2 seconds
    setInterval(() => {
      this.processJobs();
    }, 2000);
  }

  private async processJobs(): Promise<void> {
    if (this.processing || this.jobs.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const job = this.jobs.shift();
      if (!job) {
        this.processing = false;
        return;
      }

      job.processing = true;
      job.attempts++;

      this.logger.log(`Processing job "${job.name}" (attempt ${job.attempts})`);

      try {
        // Create a mock job object that matches Bull's Job interface
        const mockJob = {
          id: job.id,
          name: job.name,
          data: job.data,
          opts: {},
          progress: async (progress: number) => {
            this.logger.log(`Job "${job.name}" progress: ${progress}%`);
          },
          attemptsMade: job.attempts,
          timestamp: job.createdAt.getTime(),
          processedOn: Date.now(),
          finishedOn: null,
          failed: false,
          failedReason: null
        };

        // Process the job based on its name
        if (job.name === 'enhance-word-details') {
          if (this.wordProcessingConsumer) {
            await this.wordProcessingConsumer.enhanceWordDetails(mockJob as any);
          } else {
            this.logger.warn('WordProcessingConsumer not set, skipping job');
          }
        } else {
          this.logger.warn(`Unknown job type: ${job.name}`);
        }

        this.logger.log(`Job "${job.name}" completed successfully`);

      } catch (error) {
        this.logger.error(`Job "${job.name}" failed:`, error);
        
        // Retry logic
        if (job.attempts < 3) {
          this.logger.log(`Retrying job "${job.name}" (attempt ${job.attempts + 1}/3)`);
          // Put job back in queue for retry
          this.jobs.unshift(job);
        } else {
          this.logger.error(`Job "${job.name}" failed after 3 attempts. Giving up.`);
        }
      }

    } catch (error) {
      this.logger.error('Error in job processing:', error);
    } finally {
      this.processing = false;
    }
  }

  getQueueStatus(): { queueSize: number; processing: boolean } {
    return {
      queueSize: this.jobs.length,
      processing: this.processing
    };
  }
}