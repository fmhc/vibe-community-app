import { logger } from './logger.server';

// Database connection pool configuration
interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingRequests: number;
}

class DatabaseOptimizer {
  private config: ConnectionPoolConfig;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private slowQueryThreshold: number = 1000; // 1 second
  private metricsRetentionDays: number = 7;

  constructor() {
    this.config = {
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
      idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'), // 30 seconds
      connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'), // 5 seconds
      retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000'), // 1 second
    };

    logger.info('Database optimizer initialized', {
      service: 'database',
      method: 'constructor',
      config: this.config
    });
  }

  // Wrap database queries with performance monitoring
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    queryText?: string
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await queryFn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.recordQueryMetrics({
        query: queryName,
        duration,
        timestamp: Date.now(),
        success,
        error
      });

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.performance(`slow_query_${queryName}`, duration, {
          queryName,
          success,
          queryText: queryText?.substring(0, 100) + '...' || undefined
        });
      }

      // Log performance
      logger.performance(`query_${queryName}`, duration, {
        queryName,
        success
      });
    }
  }

  private recordQueryMetrics(metric: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metric);

    // Keep only recent metrics
    const cutoffTime = Date.now() - (this.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoffTime);
  }

  // Get query performance statistics
  getQueryStats(hours: number = 24): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    errorRate: number;
    topSlowQueries: Array<{ query: string; avgDuration: number; count: number }>;
  } {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp > cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorRate: 0,
        topSlowQueries: []
      };
    }

    const totalQueries = recentMetrics.length;
    const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const errorRate = recentMetrics.filter(m => !m.success).length / totalQueries;

    // Group by query name and calculate averages
    const queryGroups = new Map<string, { durations: number[]; count: number }>();
    
    recentMetrics.forEach(metric => {
      if (!queryGroups.has(metric.query)) {
        queryGroups.set(metric.query, { durations: [], count: 0 });
      }
      const group = queryGroups.get(metric.query)!;
      group.durations.push(metric.duration);
      group.count++;
    });

    const topSlowQueries = Array.from(queryGroups.entries())
      .map(([query, data]) => ({
        query,
        avgDuration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
        count: data.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration),
      slowQueries,
      errorRate: Math.round(errorRate * 100) / 100,
      topSlowQueries
    };
  }

  // Connection retry wrapper with exponential backoff
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retryAttempts) {
          logger.serviceError('database', 'withRetry', 
            `Operation failed after ${this.config.retryAttempts} attempts: ${operationName}`,
            lastError,
            { operationName, attempts: attempt }
          );
          throw lastError;
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        
        logger.warn('Database operation failed, retrying', {
          service: 'database',
          method: 'withRetry',
          operationName,
          attempt,
          nextRetryIn: delay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Health check for database connections
  async checkDatabaseHealth(): Promise<{
    healthy: boolean;
    connectionTime: number;
    queryTime: number;
    error?: string;
  }> {
    try {
      const connectionStart = Date.now();
      
      // This would be implemented with actual database connection test
      // For now, simulating a health check
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const connectionTime = Date.now() - connectionStart;
      
      const queryStart = Date.now();
      
      // Simulate a simple query test
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const queryTime = Date.now() - queryStart;

      logger.info('Database health check completed', {
        service: 'database',
        method: 'checkDatabaseHealth',
        connectionTime,
        queryTime
      });

      return {
        healthy: true,
        connectionTime,
        queryTime
      };
    } catch (error) {
      logger.serviceError('database', 'checkDatabaseHealth', 'Health check failed', error as Error);
      
      return {
        healthy: false,
        connectionTime: 0,
        queryTime: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Query optimization suggestions
  analyzeQueryPerformance(): {
    suggestions: string[];
    criticalIssues: string[];
    optimizationScore: number;
  } {
    const stats = this.getQueryStats(24);
    const suggestions: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze error rate
    if (stats.errorRate > 0.05) { // 5% error rate
      criticalIssues.push(`High error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
    }

    // Analyze slow queries
    if (stats.slowQueries > stats.totalQueries * 0.1) { // 10% slow queries
      criticalIssues.push(`High number of slow queries: ${stats.slowQueries}/${stats.totalQueries}`);
    }

    // Analyze average duration
    if (stats.averageDuration > 500) { // 500ms average
      suggestions.push('Consider optimizing frequently used queries');
    }

    // Specific query suggestions
    stats.topSlowQueries.forEach(query => {
      if (query.avgDuration > 2000) { // 2 seconds
        suggestions.push(`Optimize "${query.query}" query (avg: ${query.avgDuration}ms)`);
      }
    });

    // Connection pool suggestions
    suggestions.push('Consider implementing connection pooling if not already done');
    suggestions.push('Add database indexes for frequently queried columns');
    suggestions.push('Implement query result caching for read-heavy operations');

    // Calculate optimization score (0-100)
    let score = 100;
    score -= Math.min(stats.errorRate * 1000, 50); // Error rate penalty
    score -= Math.min((stats.slowQueries / stats.totalQueries) * 100, 30); // Slow query penalty
    score -= Math.min((stats.averageDuration - 100) / 10, 20); // Duration penalty

    return {
      suggestions,
      criticalIssues,
      optimizationScore: Math.max(0, Math.round(score))
    };
  }

  // Generate performance report
  generatePerformanceReport(): string {
    const stats = this.getQueryStats(24);
    const analysis = this.analyzeQueryPerformance();

    let report = '\n📊 Database Performance Report (24h)\n';
    report += '=' .repeat(50) + '\n\n';

    report += `📈 Query Statistics:\n`;
    report += `  Total Queries: ${stats.totalQueries}\n`;
    report += `  Average Duration: ${stats.averageDuration}ms\n`;
    report += `  Slow Queries: ${stats.slowQueries} (${((stats.slowQueries / stats.totalQueries) * 100).toFixed(1)}%)\n`;
    report += `  Error Rate: ${(stats.errorRate * 100).toFixed(2)}%\n`;
    report += `  Optimization Score: ${analysis.optimizationScore}/100\n\n`;

    if (analysis.criticalIssues.length > 0) {
      report += `🚨 Critical Issues:\n`;
      analysis.criticalIssues.forEach(issue => {
        report += `  • ${issue}\n`;
      });
      report += '\n';
    }

    if (stats.topSlowQueries.length > 0) {
      report += `🐌 Top Slow Queries:\n`;
      stats.topSlowQueries.slice(0, 5).forEach((query, index) => {
        report += `  ${index + 1}. ${query.query} (${query.avgDuration}ms avg, ${query.count} times)\n`;
      });
      report += '\n';
    }

    if (analysis.suggestions.length > 0) {
      report += `💡 Optimization Suggestions:\n`;
      analysis.suggestions.forEach(suggestion => {
        report += `  • ${suggestion}\n`;
      });
      report += '\n';
    }

    return report;
  }

  // Batch query optimization
  async executeBatch<T>(
    queries: Array<{
      name: string;
      fn: () => Promise<T>;
    }>,
    options: {
      parallel?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<T[]> {
    const { parallel = false, maxConcurrency = 5 } = options;

    if (parallel) {
      // Execute queries in parallel with concurrency limit
      const results: T[] = [];
      const chunks: typeof queries[] = [];
      
      for (let i = 0; i < queries.length; i += maxConcurrency) {
        chunks.push(queries.slice(i, i + maxConcurrency));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(query => this.monitorQuery(query.name, query.fn))
        );
        results.push(...chunkResults);
      }

      return results;
    } else {
      // Execute queries sequentially
      const results: T[] = [];
      for (const query of queries) {
        const result = await this.monitorQuery(query.name, query.fn);
        results.push(result);
      }
      return results;
    }
  }

  // Clear old metrics
  clearOldMetrics(): void {
    const cutoffTime = Date.now() - (this.metricsRetentionDays * 24 * 60 * 60 * 1000);
    const originalCount = this.queryMetrics.length;
    this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoffTime);
    
    const removedCount = originalCount - this.queryMetrics.length;
    if (removedCount > 0) {
      logger.info('Old query metrics cleaned up', {
        service: 'database',
        method: 'clearOldMetrics',
        removedCount,
        remainingCount: this.queryMetrics.length
      });
    }
  }
}

// Create singleton instance
export const databaseOptimizer = new DatabaseOptimizer();

// Helper functions for common database operations
export async function optimizedQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return databaseOptimizer.monitorQuery(name, queryFn);
}

export async function batchQueries<T>(
  queries: Array<{
    name: string;
    fn: () => Promise<T>;
  }>,
  parallel: boolean = false
): Promise<T[]> {
  return databaseOptimizer.executeBatch(queries, { parallel });
}

export function getDatabaseStats(hours: number = 24) {
  return databaseOptimizer.getQueryStats(hours);
}

export function getDatabaseHealthCheck() {
  return databaseOptimizer.checkDatabaseHealth();
}

export function generateDatabaseReport(): string {
  return databaseOptimizer.generatePerformanceReport();
} 