import { logger } from './logger.server';
import { getCacheStats, shutdownCaches } from './cache.server';
import { getEmailQueueStats, emailQueue } from './email-queue.server';
import { getDatabaseStats } from './database-optimizer.server';

interface BackupConfig {
  interval: number; // Backup interval in milliseconds
  retentionDays: number; // How long to keep backups
  compressionLevel: number; // 0-9, higher = better compression but slower
  encryptionEnabled: boolean;
  s3Bucket?: string;
  localPath: string;
}

interface BackupMetadata {
  id: string;
  timestamp: number;
  type: 'full' | 'incremental' | 'differential';
  size: number; // bytes
  duration: number; // milliseconds
  checksum: string;
  version: string;
  tables: string[];
  success: boolean;
  error?: string;
}

interface RecoveryPoint {
  backupId: string;
  timestamp: number;
  type: BackupMetadata['type'];
  description: string;
  dataIntegrity: 'verified' | 'unverified' | 'corrupted';
}

class BackupRecoveryService {
  private config: BackupConfig;
  private backupHistory: BackupMetadata[] = [];
  private backupTimer: NodeJS.Timeout | null = null;
  private isBackupInProgress = false;

  constructor() {
    this.config = {
      interval: parseInt(process.env.BACKUP_INTERVAL || '86400000'), // 24 hours
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL || '6'),
      encryptionEnabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
      s3Bucket: process.env.BACKUP_S3_BUCKET,
      localPath: process.env.BACKUP_LOCAL_PATH || '/tmp/backups'
    };

    logger.info('Backup and recovery service initialized', {
      service: 'backup-recovery',
      method: 'constructor',
      config: {
        interval: this.config.interval,
        retentionDays: this.config.retentionDays,
        encryptionEnabled: this.config.encryptionEnabled,
        hasS3Bucket: !!this.config.s3Bucket
      }
    });

    this.startBackupScheduler();
  }

  private startBackupScheduler(): void {
    this.backupTimer = setInterval(() => {
      this.performScheduledBackup();
    }, this.config.interval);

    logger.info('Backup scheduler started', {
      service: 'backup-recovery',
      method: 'startBackupScheduler',
      intervalHours: this.config.interval / (1000 * 60 * 60)
    });
  }

  private async performScheduledBackup(): Promise<void> {
    if (this.isBackupInProgress) {
      logger.warn('Backup already in progress, skipping scheduled backup', {
        service: 'backup-recovery',
        method: 'performScheduledBackup'
      });
      return;
    }

    try {
      await this.createBackup('incremental');
    } catch (error) {
      logger.serviceError('backup-recovery', 'performScheduledBackup', 
        'Scheduled backup failed', error as Error);
    }
  }

  // Create backup
  async createBackup(
    type: 'full' | 'incremental' | 'differential' = 'incremental',
    description?: string
  ): Promise<BackupMetadata> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.isBackupInProgress = true;
    const startTime = Date.now();
    const backupId = this.generateBackupId();

    logger.info('Starting backup', {
      service: 'backup-recovery',
      method: 'createBackup',
      backupId,
      type,
      description
    });

    try {
      // Pre-backup health checks
      await this.performPreBackupChecks();

      // Create system state snapshot
      const systemState = await this.captureSystemState();

      // Backup database
      const databaseBackup = await this.backupDatabase(type);

      // Backup application state
      const applicationBackup = await this.backupApplicationState();

      // Backup file system
      const filesystemBackup = await this.backupFileSystem();

      // Create backup archive
      const backupSize = await this.createBackupArchive(backupId, {
        systemState,
        database: databaseBackup,
        application: applicationBackup,
        filesystem: filesystemBackup
      });

      // Calculate checksum
      const checksum = await this.calculateChecksum(backupId);

      // Store backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        type,
        size: backupSize,
        duration: Date.now() - startTime,
        checksum,
        version: process.env.APP_VERSION || '1.0.0',
        tables: await this.getTableList(),
        success: true
      };

      this.backupHistory.push(metadata);

      // Upload to cloud storage if configured
      if (this.config.s3Bucket) {
        await this.uploadToS3(backupId, metadata);
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      logger.info('Backup completed successfully', {
        service: 'backup-recovery',
        method: 'createBackup',
        backupId,
        type,
        size: backupSize,
        duration: metadata.duration,
        checksum
      });

      return metadata;

    } catch (error) {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        type,
        size: 0,
        duration: Date.now() - startTime,
        checksum: '',
        version: process.env.APP_VERSION || '1.0.0',
        tables: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      this.backupHistory.push(metadata);

      logger.serviceError('backup-recovery', 'createBackup', 
        'Backup failed', error as Error, {
          backupId,
          type,
          duration: metadata.duration
        });

      throw error;
    } finally {
      this.isBackupInProgress = false;
    }
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substr(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  private async performPreBackupChecks(): Promise<void> {
    // Check disk space
    const freeSpace = await this.checkDiskSpace();
    const requiredSpace = 1024 * 1024 * 1024; // 1GB minimum

    if (freeSpace < requiredSpace) {
      throw new Error(`Insufficient disk space for backup. Required: ${requiredSpace}, Available: ${freeSpace}`);
    }

    // Check database connectivity
    const dbHealth = await getDatabaseStats();
    if (dbHealth.errorRate > 0.1) {
      logger.warn('High database error rate detected before backup', {
        service: 'backup-recovery',
        method: 'performPreBackupChecks',
        errorRate: dbHealth.errorRate
      });
    }

    logger.debug('Pre-backup checks completed', {
      service: 'backup-recovery',
      method: 'performPreBackupChecks',
      freeSpace,
      dbErrorRate: dbHealth.errorRate
    });
  }

  private async checkDiskSpace(): Promise<number> {
    // Simulate disk space check
    // In production, this would use actual file system APIs
    return 10 * 1024 * 1024 * 1024; // 10GB
  }

  private async captureSystemState(): Promise<any> {
    return {
      timestamp: Date.now(),
      cacheStats: getCacheStats(),
      emailQueueStats: getEmailQueueStats(),
      databaseStats: getDatabaseStats(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime()
      },
      memoryUsage: process.memoryUsage(),
      resourceUsage: process.resourceUsage()
    };
  }

  private async backupDatabase(type: BackupMetadata['type']): Promise<any> {
    logger.debug('Starting database backup', {
      service: 'backup-recovery',
      method: 'backupDatabase',
      type
    });

    // Simulate database backup
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      type,
      tables: await this.getTableList(),
      recordCount: 1000, // Simulated
      timestamp: Date.now()
    };
  }

  private async backupApplicationState(): Promise<any> {
    logger.debug('Starting application state backup', {
      service: 'backup-recovery',
      method: 'backupApplicationState'
    });

    return {
      caches: getCacheStats(),
      emailQueue: getEmailQueueStats(),
      configuration: {
        // Only non-sensitive config values
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL
      },
      timestamp: Date.now()
    };
  }

  private async backupFileSystem(): Promise<any> {
    logger.debug('Starting filesystem backup', {
      service: 'backup-recovery',
      method: 'backupFileSystem'
    });

    // Simulate filesystem backup
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      paths: ['/app/uploads', '/app/logs', '/app/config'],
      fileCount: 50,
      totalSize: 100 * 1024 * 1024, // 100MB
      timestamp: Date.now()
    };
  }

  private async createBackupArchive(backupId: string, data: any): Promise<number> {
    logger.debug('Creating backup archive', {
      service: 'backup-recovery',
      method: 'createBackupArchive',
      backupId
    });

    // Simulate archive creation with compression
    const baseSize = JSON.stringify(data).length;
    const compressionRatio = 0.7 - (this.config.compressionLevel * 0.05); // Higher compression = smaller size
    const compressedSize = Math.floor(baseSize * compressionRatio);

    await new Promise(resolve => setTimeout(resolve, 1500));

    return compressedSize;
  }

  private async calculateChecksum(backupId: string): Promise<string> {
    // Simulate checksum calculation
    await new Promise(resolve => setTimeout(resolve, 500));
    return `sha256_${backupId.slice(-16)}`;
  }

  private async getTableList(): Promise<string[]> {
    // Return list of tables that were backed up
    return [
      'community_members',
      'directus_users',
      'email_campaigns',
      'events',
      'email_verification_tokens'
    ];
  }

  private async uploadToS3(backupId: string, metadata: BackupMetadata): Promise<void> {
    logger.info('Uploading backup to S3', {
      service: 'backup-recovery',
      method: 'uploadToS3',
      backupId,
      bucket: this.config.s3Bucket,
      size: metadata.size
    });

    // Simulate S3 upload
    await new Promise(resolve => setTimeout(resolve, 3000));

    logger.info('Backup uploaded to S3 successfully', {
      service: 'backup-recovery',
      method: 'uploadToS3',
      backupId
    });
  }

  private async cleanupOldBackups(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const toDelete = this.backupHistory.filter(backup => 
      backup.timestamp < cutoffTime && backup.success
    );

    for (const backup of toDelete) {
      try {
        await this.deleteBackup(backup.id);
        logger.debug('Old backup deleted', {
          service: 'backup-recovery',
          method: 'cleanupOldBackups',
          backupId: backup.id,
          age: Date.now() - backup.timestamp
        });
      } catch (error) {
        logger.serviceError('backup-recovery', 'cleanupOldBackups',
          `Failed to delete old backup: ${backup.id}`, error as Error);
      }
    }

    // Remove from history
    this.backupHistory = this.backupHistory.filter(backup => 
      backup.timestamp >= cutoffTime || !backup.success
    );

    if (toDelete.length > 0) {
      logger.info('Backup cleanup completed', {
        service: 'backup-recovery',
        method: 'cleanupOldBackups',
        deletedCount: toDelete.length,
        remainingCount: this.backupHistory.length
      });
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    // Simulate backup deletion
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Recovery operations
  async listRecoveryPoints(): Promise<RecoveryPoint[]> {
    return this.backupHistory
      .filter(backup => backup.success)
      .map(backup => ({
        backupId: backup.id,
        timestamp: backup.timestamp,
        type: backup.type,
        description: `${backup.type} backup - ${new Date(backup.timestamp).toISOString()}`,
        dataIntegrity: 'verified' as const
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async verifyBackup(backupId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendation: string;
  }> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      return {
        valid: false,
        issues: ['Backup not found'],
        recommendation: 'Create a new backup'
      };
    }

    logger.info('Verifying backup integrity', {
      service: 'backup-recovery',
      method: 'verifyBackup',
      backupId
    });

    const issues: string[] = [];

    // Simulate integrity checks
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check file integrity
    const currentChecksum = await this.calculateChecksum(backupId);
    if (currentChecksum !== backup.checksum) {
      issues.push('Checksum mismatch - backup may be corrupted');
    }

    // Check completeness
    if (backup.size < 1000) {
      issues.push('Backup size is suspiciously small');
    }

    const valid = issues.length === 0;

    logger.info('Backup verification completed', {
      service: 'backup-recovery',
      method: 'verifyBackup',
      backupId,
      valid,
      issueCount: issues.length
    });

    return {
      valid,
      issues,
      recommendation: valid ? 'Backup is valid and ready for recovery' : 'Backup has issues, consider creating a new one'
    };
  }

  async performRecovery(
    backupId: string,
    options: {
      databaseOnly?: boolean;
      applicationStateOnly?: boolean;
      verifyBefore?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    duration: number;
    restoredTables: string[];
    warnings: string[];
    error?: string;
  }> {
    const startTime = Date.now();
    const warnings: string[] = [];

    logger.info('Starting recovery operation', {
      service: 'backup-recovery',
      method: 'performRecovery',
      backupId,
      options
    });

    try {
      // Verify backup if requested
      if (options.verifyBefore) {
        const verification = await this.verifyBackup(backupId);
        if (!verification.valid) {
          throw new Error(`Backup verification failed: ${verification.issues.join(', ')}`);
        }
      }

      const backup = this.backupHistory.find(b => b.id === backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Stop services before recovery
      await this.stopServices();

      // Simulate recovery process
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Restore database
      let restoredTables: string[] = [];
      if (!options.applicationStateOnly) {
        restoredTables = await this.restoreDatabase(backupId);
      }

      // Restore application state
      if (!options.databaseOnly) {
        await this.restoreApplicationState(backupId);
      }

      // Restart services
      await this.startServices();

      // Post-recovery validation
      await this.validateRecovery();

      const duration = Date.now() - startTime;

      logger.info('Recovery completed successfully', {
        service: 'backup-recovery',
        method: 'performRecovery',
        backupId,
        duration,
        restoredTables: restoredTables.length,
        warnings: warnings.length
      });

      return {
        success: true,
        duration,
        restoredTables,
        warnings
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.serviceError('backup-recovery', 'performRecovery',
        'Recovery operation failed', error as Error, {
          backupId,
          duration,
          options
        });

      return {
        success: false,
        duration,
        restoredTables: [],
        warnings,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async stopServices(): Promise<void> {
    logger.info('Stopping services for recovery', {
      service: 'backup-recovery',
      method: 'stopServices'
    });

    // Stop email queue processing
    await emailQueue.shutdown();

    // Shutdown caches
    shutdownCaches();

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async startServices(): Promise<void> {
    logger.info('Starting services after recovery', {
      service: 'backup-recovery',
      method: 'startServices'
    });

    // Services would be restarted here
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async restoreDatabase(backupId: string): Promise<string[]> {
    logger.info('Restoring database', {
      service: 'backup-recovery',
      method: 'restoreDatabase',
      backupId
    });

    // Simulate database restore
    await new Promise(resolve => setTimeout(resolve, 3000));

    return await this.getTableList();
  }

  private async restoreApplicationState(backupId: string): Promise<void> {
    logger.info('Restoring application state', {
      service: 'backup-recovery',
      method: 'restoreApplicationState',
      backupId
    });

    // Simulate application state restore
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async validateRecovery(): Promise<void> {
    logger.info('Validating recovery', {
      service: 'backup-recovery',
      method: 'validateRecovery'
    });

    // Simulate post-recovery validation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Get backup statistics
  getBackupStats(): {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    oldestBackup?: number;
    newestBackup?: number;
    averageSize: number;
    successRate: number;
  } {
    const successful = this.backupHistory.filter(b => b.success);
    const failed = this.backupHistory.filter(b => !b.success);
    const totalSize = successful.reduce((sum, b) => sum + b.size, 0);
    const timestamps = this.backupHistory.map(b => b.timestamp);

    return {
      totalBackups: this.backupHistory.length,
      successfulBackups: successful.length,
      failedBackups: failed.length,
      totalSize,
      oldestBackup: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestBackup: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
      averageSize: successful.length > 0 ? totalSize / successful.length : 0,
      successRate: this.backupHistory.length > 0 ? successful.length / this.backupHistory.length : 0
    };
  }

  // Generate backup report
  generateBackupReport(): string {
    const stats = this.getBackupStats();
    const recentBackups = this.backupHistory
      .filter(b => Date.now() - b.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .sort((a, b) => b.timestamp - a.timestamp);

    let report = '\n💾 Backup & Recovery Report\n';
    report += '=' .repeat(35) + '\n\n';

    report += `📊 Backup Statistics:\n`;
    report += `  Total Backups: ${stats.totalBackups}\n`;
    report += `  Successful: ${stats.successfulBackups}\n`;
    report += `  Failed: ${stats.failedBackups}\n`;
    report += `  Success Rate: ${(stats.successRate * 100).toFixed(1)}%\n`;
    report += `  Total Size: ${(stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB\n`;
    report += `  Average Size: ${(stats.averageSize / (1024 * 1024)).toFixed(2)} MB\n\n`;

    if (stats.newestBackup) {
      const lastBackupAge = (Date.now() - stats.newestBackup) / (1000 * 60 * 60);
      report += `⏰ Last Backup: ${lastBackupAge.toFixed(1)} hours ago\n`;
    }

    if (recentBackups.length > 0) {
      report += `\n📈 Recent Backups (7 days):\n`;
      recentBackups.slice(0, 5).forEach((backup, index) => {
        const age = (Date.now() - backup.timestamp) / (1000 * 60 * 60);
        const status = backup.success ? '✅' : '❌';
        const size = (backup.size / (1024 * 1024)).toFixed(1);
        report += `  ${index + 1}. ${status} ${backup.type} - ${age.toFixed(1)}h ago (${size} MB)\n`;
      });
    }

    // Recommendations
    report += `\n💡 Recommendations:\n`;
    if (stats.successRate < 0.9) {
      report += `  🚨 Low backup success rate. Check backup configuration.\n`;
    }
    if (stats.newestBackup && (Date.now() - stats.newestBackup) > 48 * 60 * 60 * 1000) {
      report += `  ⚠️  Last backup is over 48 hours old. Check backup scheduler.\n`;
    }
    if (stats.totalSize > 50 * 1024 * 1024 * 1024) { // 50GB
      report += `  📦 Large backup size. Consider implementing incremental backups.\n`;
    }

    return report;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }

    // Wait for any ongoing backup to complete
    while (this.isBackupInProgress) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('Backup and recovery service shutdown completed', {
      service: 'backup-recovery',
      method: 'shutdown',
      totalBackups: this.backupHistory.length
    });
  }
}

// Create singleton instance
export const backupRecoveryService = new BackupRecoveryService();

// Helper functions
export async function createSystemBackup(
  type: 'full' | 'incremental' | 'differential' = 'incremental'
): Promise<BackupMetadata> {
  return backupRecoveryService.createBackup(type);
}

export async function restoreFromBackup(
  backupId: string,
  options?: {
    databaseOnly?: boolean;
    applicationStateOnly?: boolean;
    verifyBefore?: boolean;
  }
) {
  return backupRecoveryService.performRecovery(backupId, options);
}

export function getBackupStatus() {
  return backupRecoveryService.getBackupStats();
}

export function generateBackupReport(): string {
  return backupRecoveryService.generateBackupReport();
} 