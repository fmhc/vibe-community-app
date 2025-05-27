import { logger } from './logger.server';

export interface EmailJob {
  id: string;
  type: 'verification' | 'newsletter' | 'campaign' | 'welcome' | 'reset-password';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipient: string;
  templateData: any;
  scheduledAt?: number;
  maxRetries: number;
  retryCount: number;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

interface QueueConfig {
  maxConcurrentJobs: number;
  batchSize: number;
  retryDelay: number;
  maxRetries: number;
  processingInterval: number;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  throughput: number; // emails per minute
}

class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = new Set<string>();
  private completed = new Map<string, number>(); // jobId -> completedAt
  private failed = new Map<string, EmailJob>();
  private config: QueueConfig;
  private processingTimer: NodeJS.Timeout | null = null;
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    startTime: Date.now()
  };

  constructor() {
    this.config = {
      maxConcurrentJobs: parseInt(process.env.EMAIL_MAX_CONCURRENT || '5'),
      batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '10'),
      retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '300000'), // 5 minutes
      maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
      processingInterval: parseInt(process.env.EMAIL_PROCESSING_INTERVAL || '30000'), // 30 seconds
    };

    this.startProcessing();
    
    logger.info('Email queue initialized', {
      service: 'email-queue',
      method: 'constructor',
      config: this.config
    });
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
  }

  // Add email job to queue
  async addJob(
    type: EmailJob['type'],
    recipient: string,
    templateData: any,
    options: {
      priority?: EmailJob['priority'];
      scheduledAt?: number;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    const job: EmailJob = {
      id: this.generateJobId(),
      type,
      priority: options.priority || 'normal',
      recipient: recipient.toLowerCase(),
      templateData,
      scheduledAt: options.scheduledAt,
      maxRetries: options.maxRetries || this.config.maxRetries,
      retryCount: 0,
      createdAt: Date.now()
    };

    // Insert job based on priority
    const insertIndex = this.findInsertPosition(job);
    this.queue.splice(insertIndex, 0, job);

    logger.debug('Email job added to queue', {
      service: 'email-queue',
      method: 'addJob',
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      recipient: job.recipient.split('@')[0] + '@***',
      queueSize: this.queue.length
    });

    return job.id;
  }

  private generateJobId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private findInsertPosition(job: EmailJob): number {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const jobPriority = priorityOrder[job.priority];

    let insertIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = priorityOrder[this.queue[i].priority];
      if (jobPriority <= existingPriority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    return insertIndex;
  }

  // Process queue
  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrentJobs) {
      return; // Already at max capacity
    }

    const availableSlots = this.config.maxConcurrentJobs - this.processing.size;
    const jobsToProcess = this.getNextJobs(Math.min(availableSlots, this.config.batchSize));

    if (jobsToProcess.length === 0) {
      return; // No jobs to process
    }

    logger.debug('Processing email batch', {
      service: 'email-queue',
      method: 'processQueue',
      batchSize: jobsToProcess.length,
      queueSize: this.queue.length,
      processing: this.processing.size
    });

    // Process jobs in parallel
    const promises = jobsToProcess.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  private getNextJobs(count: number): EmailJob[] {
    const now = Date.now();
    const readyJobs: EmailJob[] = [];

    for (let i = 0; i < this.queue.length && readyJobs.length < count; i++) {
      const job = this.queue[i];
      
      // Check if job is ready to be processed
      if (!job.scheduledAt || job.scheduledAt <= now) {
        // Check if it's time for retry
        if (job.retryCount === 0 || !job.lastAttempt || 
            (now - job.lastAttempt) >= this.config.retryDelay) {
          readyJobs.push(job);
          this.queue.splice(i, 1); // Remove from queue
          i--; // Adjust index after removal
        }
      }
    }

    return readyJobs;
  }

  private async processJob(job: EmailJob): Promise<void> {
    this.processing.add(job.id);
    job.lastAttempt = Date.now();

    try {
      logger.debug('Processing email job', {
        service: 'email-queue',
        method: 'processJob',
        jobId: job.id,
        type: job.type,
        attempt: job.retryCount + 1,
        recipient: job.recipient.split('@')[0] + '@***'
      });

      // Simulate email sending (replace with actual email service call)
      await this.sendEmail(job);

      // Mark as completed
      this.completed.set(job.id, Date.now());
      this.stats.totalProcessed++;

      logger.info('Email job completed successfully', {
        service: 'email-queue',
        method: 'processJob',
        jobId: job.id,
        type: job.type,
        recipient: job.recipient.split('@')[0] + '@***'
      });

    } catch (error) {
      job.retryCount++;
      job.error = error instanceof Error ? error.message : String(error);

      if (job.retryCount >= job.maxRetries) {
        // Max retries reached, mark as failed
        this.failed.set(job.id, job);
        this.stats.totalFailed++;

        logger.serviceError('email-queue', 'processJob', 
          `Email job failed after ${job.maxRetries} attempts`,
          error as Error,
          {
            jobId: job.id,
            type: job.type,
            recipient: job.recipient.split('@')[0] + '@***',
            retryCount: job.retryCount
          }
        );
      } else {
        // Schedule for retry
        this.queue.unshift(job); // Add back to front of queue for retry

        logger.warn('Email job failed, scheduling retry', {
          service: 'email-queue',
          method: 'processJob',
          jobId: job.id,
          type: job.type,
          recipient: job.recipient.split('@')[0] + '@***',
          retryCount: job.retryCount,
          nextRetryIn: this.config.retryDelay,
          error: job.error
        });
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  private async sendEmail(job: EmailJob): Promise<void> {
    // This would integrate with the actual email service
    // For now, simulating email send with variable delay
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated email service failure');
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Add bulk jobs efficiently
  async addBulkJobs(
    jobs: Array<{
      type: EmailJob['type'];
      recipient: string;
      templateData: any;
      priority?: EmailJob['priority'];
    }>
  ): Promise<string[]> {
    const jobIds: string[] = [];
    const emailJobs: EmailJob[] = [];

    for (const jobData of jobs) {
      const job: EmailJob = {
        id: this.generateJobId(),
        type: jobData.type,
        priority: jobData.priority || 'normal',
        recipient: jobData.recipient.toLowerCase(),
        templateData: jobData.templateData,
        maxRetries: this.config.maxRetries,
        retryCount: 0,
        createdAt: Date.now()
      };

      emailJobs.push(job);
      jobIds.push(job.id);
    }

    // Sort by priority and add to queue
    emailJobs.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.queue.unshift(...emailJobs);

    logger.info('Bulk email jobs added', {
      service: 'email-queue',
      method: 'addBulkJobs',
      count: jobs.length,
      queueSize: this.queue.length
    });

    return jobIds;
  }

  // Get queue statistics
  getStats(): QueueStats {
    const now = Date.now();
    const runningTime = (now - this.stats.startTime) / 1000 / 60; // minutes
    const throughput = runningTime > 0 ? this.stats.totalProcessed / runningTime : 0;

    // Count retrying jobs
    const retrying = this.queue.filter(job => job.retryCount > 0).length;

    return {
      pending: this.queue.length - retrying,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
      retrying,
      throughput: Math.round(throughput * 100) / 100
    };
  }

  // Get job status
  getJobStatus(jobId: string): 'pending' | 'processing' | 'completed' | 'failed' | 'not-found' {
    if (this.processing.has(jobId)) return 'processing';
    if (this.completed.has(jobId)) return 'completed';
    if (this.failed.has(jobId)) return 'failed';
    if (this.queue.find(job => job.id === jobId)) return 'pending';
    return 'not-found';
  }

  // Priority queue management
  promoteJob(jobId: string, newPriority: EmailJob['priority']): boolean {
    const jobIndex = this.queue.findIndex(job => job.id === jobId);
    if (jobIndex === -1) return false;

    const job = this.queue[jobIndex];
    job.priority = newPriority;

    // Remove and reinsert at correct position
    this.queue.splice(jobIndex, 1);
    const insertIndex = this.findInsertPosition(job);
    this.queue.splice(insertIndex, 0, job);

    logger.debug('Email job priority updated', {
      service: 'email-queue',
      method: 'promoteJob',
      jobId,
      newPriority,
      newPosition: insertIndex
    });

    return true;
  }

  // Schedule email for later delivery
  async scheduleEmail(
    type: EmailJob['type'],
    recipient: string,
    templateData: any,
    scheduledAt: Date,
    options: {
      priority?: EmailJob['priority'];
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    return this.addJob(type, recipient, templateData, {
      ...options,
      scheduledAt: scheduledAt.getTime()
    });
  }

  // Clear completed jobs older than specified time
  clearOldCompletedJobs(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleared = 0;

    for (const [jobId, completedAt] of this.completed.entries()) {
      if (completedAt < cutoff) {
        this.completed.delete(jobId);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info('Old completed email jobs cleared', {
        service: 'email-queue',
        method: 'clearOldCompletedJobs',
        cleared,
        remaining: this.completed.size
      });
    }

    return cleared;
  }

  // Retry failed jobs
  retryFailedJobs(olderThanMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let retried = 0;

    for (const [jobId, job] of this.failed.entries()) {
      if (job.lastAttempt && job.lastAttempt < cutoff) {
        // Reset retry count and add back to queue
        job.retryCount = 0;
        job.error = undefined;
        this.queue.unshift(job);
        this.failed.delete(jobId);
        retried++;
      }
    }

    if (retried > 0) {
      logger.info('Failed email jobs retried', {
        service: 'email-queue',
        method: 'retryFailedJobs',
        retried,
        remainingFailed: this.failed.size
      });
    }

    return retried;
  }

  // Generate performance report
  generateReport(): string {
    const stats = this.getStats();
    const runningTime = (Date.now() - this.stats.startTime) / 1000 / 60; // minutes

    let report = '\n📧 Email Queue Performance Report\n';
    report += '=' .repeat(40) + '\n\n';

    report += `📊 Queue Statistics:\n`;
    report += `  Pending: ${stats.pending}\n`;
    report += `  Processing: ${stats.processing}\n`;
    report += `  Completed: ${stats.completed}\n`;
    report += `  Failed: ${stats.failed}\n`;
    report += `  Retrying: ${stats.retrying}\n`;
    report += `  Throughput: ${stats.throughput} emails/min\n`;
    report += `  Running Time: ${Math.round(runningTime)} minutes\n\n`;

    // Performance analysis
    const successRate = this.stats.totalProcessed / (this.stats.totalProcessed + this.stats.totalFailed);
    report += `📈 Performance Metrics:\n`;
    report += `  Total Processed: ${this.stats.totalProcessed}\n`;
    report += `  Total Failed: ${this.stats.totalFailed}\n`;
    report += `  Success Rate: ${(successRate * 100).toFixed(2)}%\n`;
    report += `  Average Queue Size: ${Math.round((stats.pending + stats.processing) / 2)}\n\n`;

    // Recommendations
    if (stats.throughput < 10) {
      report += `⚠️  Low throughput detected. Consider increasing max concurrent jobs.\n`;
    }
    if (successRate < 0.95) {
      report += `🚨 High failure rate detected. Check email service configuration.\n`;
    }
    if (stats.pending > 100) {
      report += `📈 High queue backlog. Consider increasing processing frequency.\n`;
    }

    return report;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    // Wait for current jobs to complete
    while (this.processing.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('Email queue shutdown completed', {
      service: 'email-queue',
      method: 'shutdown',
      pendingJobs: this.queue.length,
      completedJobs: this.completed.size,
      failedJobs: this.failed.size
    });
  }
}

// Create singleton instance
export const emailQueue = new EmailQueue();

// Helper functions
export async function queueEmail(
  type: EmailJob['type'],
  recipient: string,
  templateData: any,
  priority: EmailJob['priority'] = 'normal'
): Promise<string> {
  return emailQueue.addJob(type, recipient, templateData, { priority });
}

export async function queueBulkEmails(
  jobs: Array<{
    type: EmailJob['type'];
    recipient: string;
    templateData: any;
    priority?: EmailJob['priority'];
  }>
): Promise<string[]> {
  return emailQueue.addBulkJobs(jobs);
}

export function getEmailQueueStats(): QueueStats {
  return emailQueue.getStats();
}

export function generateEmailQueueReport(): string {
  return emailQueue.generateReport();
} 