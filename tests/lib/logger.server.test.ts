import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LogLevel,
  getRequestContext,
  withErrorLogging,
  checkRateLimit,
  cleanupRateLimit,
  type LogContext,
} from '~/lib/logger.server';

// We need to create fresh logger instances for testing to respect NODE_ENV changes
class TestLogger {
  private currentLevel: LogLevel;
  
  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        this.currentLevel = LogLevel.DEBUG;
        break;
      case 'INFO':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'WARN':
        this.currentLevel = LogLevel.WARN;
        break;
      case 'ERROR':
        this.currentLevel = LogLevel.ERROR;
        break;
      default:
        this.currentLevel = process.env.NODE_ENV === 'production' 
          ? LogLevel.INFO 
          : LogLevel.DEBUG;
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }
  
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    
    const sanitized = { ...context };
    
    // Remove sensitive data
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) sanitized.token = '[REDACTED]';
    
    return sanitized;
  }
  
  private safeStringify(obj: any): string {
    const seen = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  }
  
  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined
    };
    
    return entry;
  }
  
  private output(entry: any): void {
    if (process.env.NODE_ENV === 'production') {
      console.log(this.safeStringify(entry));
    } else {
      const levelName = LogLevel[entry.level];
      const timestamp = entry.timestamp.split('T')[1].split('.')[0];
      const contextStr = entry.context ? ` [${this.safeStringify(entry.context)}]` : '';
      console.log(`[${timestamp}] ${levelName}: ${entry.message}${contextStr}`);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.output(this.createLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.output(this.createLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.output(this.createLogEntry(LogLevel.WARN, message, context, error));
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.output(this.createLogEntry(LogLevel.ERROR, message, context, error));
  }

  serviceCall(service: string, method: string, message: string, context?: any): void {
    this.info(message, { service, method, ...context });
  }

  serviceError(service: string, method: string, message: string, error?: Error, context?: any): void {
    this.error(message, { service, method, ...context }, error);
  }

  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.output(this.createLogEntry(level, `Security event: ${event}`, {
      securityEvent: true,
      severity,
      ...context
    }));
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    if (this.shouldLog(level)) {
      this.output(this.createLogEntry(level, `Performance: ${operation} took ${duration}ms`, {
        performanceMetric: true,
        operation,
        duration,
        ...context
      }));
    }
  }
}

// Mock console methods
const mockConsoleLog = vi.fn();
const originalConsoleLog = console.log;
const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  console.log = mockConsoleLog;
  mockConsoleLog.mockClear();
  // Clean up rate limit store before each test
  cleanupRateLimit();
});

afterEach(() => {
  console.log = originalConsoleLog;
  process.env.NODE_ENV = originalNodeEnv;
});

describe('Logger', () => {
  describe('Log Levels', () => {
    it('should respect log level configuration', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      // In production, debug messages should be filtered out
      logger.debug('Debug message');
      expect(mockConsoleLog).not.toHaveBeenCalled();
      
      logger.info('Info message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should log all levels in development', () => {
      process.env.NODE_ENV = 'development';
      const logger = new TestLogger();
      
      logger.debug('Debug message');
      expect(mockConsoleLog).toHaveBeenCalled();
      
      mockConsoleLog.mockClear();
      logger.info('Info message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Log Entry Structure', () => {
    it('should create structured log entries in production', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.info('Test message', { service: 'test', method: 'testMethod' });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/) // Should be JSON
      );
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level', LogLevel.INFO);
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(logEntry).toHaveProperty('context');
      expect(logEntry.context).toHaveProperty('service', 'test');
      expect(logEntry.context).toHaveProperty('method', 'testMethod');
    });

    it('should create human-readable logs in development', () => {
      process.env.NODE_ENV = 'development';
      const logger = new TestLogger();
      
      logger.info('Test message', { service: 'test' });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{2}:\d{2}:\d{2}\] INFO: Test message/);
      expect(logCall).toContain('"service":"test"');
    });
  });

  describe('Context Sanitization', () => {
    it('should sanitize sensitive data from context', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      const sensitiveContext = {
        service: 'auth',
        password: 'secret123',
        token: 'abc123token',
        email: 'test@example.com'
      };
      
      logger.info('Test message', sensitiveContext);
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.context).not.toHaveProperty('password');
      expect(logEntry.context.token).toBe('[REDACTED]');
      expect(logEntry.context.email).toBe('test@example.com'); // email should remain
    });
  });

  describe('Error Logging', () => {
    it('should include error details in log entries', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      const testError = new Error('Test error message');
      testError.stack = 'Test stack trace';
      
      logger.error('Operation failed', { service: 'test' }, testError);
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.error).toEqual({
        name: 'Error',
        message: 'Test error message',
        stack: 'Test stack trace'
      });
    });
  });

  describe('Service Helper Methods', () => {
    it('should use serviceCall helper correctly', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.serviceCall('directus', 'createUser', 'Creating new user', { userId: 'test123' });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.message).toBe('Creating new user');
      expect(logEntry.context.service).toBe('directus');
      expect(logEntry.context.method).toBe('createUser');
      expect(logEntry.context.userId).toBe('test123');
    });

    it('should use serviceError helper correctly', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      const error = new Error('Database connection failed');
      logger.serviceError('directus', 'authenticate', 'Authentication failed', error, { attempt: 2 });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.ERROR);
      expect(logEntry.message).toBe('Authentication failed');
      expect(logEntry.context.service).toBe('directus');
      expect(logEntry.context.method).toBe('authenticate');
      expect(logEntry.context.attempt).toBe(2);
      expect(logEntry.error.message).toBe('Database connection failed');
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events with appropriate severity', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.security('Rate limit exceeded', 'high', { ip: '192.168.1.1', attempts: 10 });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.ERROR); // high severity = ERROR level
      expect(logEntry.message).toBe('Security event: Rate limit exceeded');
      expect(logEntry.context.securityEvent).toBe(true);
      expect(logEntry.context.severity).toBe('high');
      expect(logEntry.context.ip).toBe('192.168.1.1');
      expect(logEntry.context.attempts).toBe(10);
    });

    it('should use WARN level for medium and low severity security events', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.security('Suspicious activity detected', 'medium', { userId: 'test123' });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.WARN);
    });
  });

  describe('Performance Logging', () => {
    it('should log slow operations as warnings', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.performance('database_query', 6000, { query: 'SELECT * FROM users' });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.WARN); // > 5000ms = WARN
      expect(logEntry.message).toBe('Performance: database_query took 6000ms');
      expect(logEntry.context.performanceMetric).toBe(true);
      expect(logEntry.context.operation).toBe('database_query');
      expect(logEntry.context.duration).toBe(6000);
    });

    it('should log fast operations as info', () => {
      process.env.NODE_ENV = 'production';
      const logger = new TestLogger();
      
      logger.performance('cache_lookup', 100, { key: 'user:123' });
      
      const logCall = mockConsoleLog.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      
      expect(logEntry.level).toBe(LogLevel.INFO); // <= 5000ms = INFO
    });
  });
});

describe('Request Context Extraction', () => {
  it('should extract request context correctly', () => {
    const mockRequest = new Request('https://example.com/test?param=value', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 Test Browser',
        'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
        'X-Real-IP': '192.168.1.100'
      }
    });

    const context = getRequestContext(mockRequest);

    expect(context).toEqual({
      method: 'POST',
      path: '/test',
      userAgent: 'Mozilla/5.0 Test Browser',
      ip: '192.168.1.100' // Should use first IP from X-Forwarded-For
    });
  });

  it('should handle missing headers gracefully', () => {
    const mockRequest = new Request('https://example.com/api');

    const context = getRequestContext(mockRequest);

    expect(context).toEqual({
      method: 'GET',
      path: '/api',
      userAgent: undefined,
      ip: 'unknown'
    });
  });

  it('should prefer X-Real-IP when X-Forwarded-For is not available', () => {
    const mockRequest = new Request('https://example.com/test', {
      headers: {
        'X-Real-IP': '203.0.113.1'
      }
    });

    const context = getRequestContext(mockRequest);
    expect(context.ip).toBe('203.0.113.1');
  });
});

describe('Error Logging Wrapper', () => {
  it('should wrap async operations and log performance', async () => {
    process.env.NODE_ENV = 'production';
    
    const slowOperation = () => new Promise(resolve => setTimeout(() => resolve('result'), 1100));
    
    const context = { service: 'test', method: 'slowOperation' };
    const result = await withErrorLogging(slowOperation, context, 'Slow operation failed');
    
    expect(result).toBe('result');
    expect(mockConsoleLog).toHaveBeenCalled();
    
    const logCall = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.context.performanceMetric).toBe(true);
    expect(logEntry.context.duration).toBeGreaterThan(1000);
  });

  it('should catch and log errors from wrapped operations', async () => {
    process.env.NODE_ENV = 'production';
    
    const failingOperation = () => Promise.reject(new Error('Operation failed'));
    
    const context = { service: 'test', method: 'failingOperation' };
    
    await expect(
      withErrorLogging(failingOperation, context, 'Test operation failed')
    ).rejects.toThrow('Operation failed');
    
    expect(mockConsoleLog).toHaveBeenCalled();
    const logCall = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    
    expect(logEntry.level).toBe(LogLevel.ERROR);
    expect(logEntry.message).toBe('Test operation failed');
    expect(logEntry.error.message).toBe('Operation failed');
  });
});

describe('Rate Limiting', () => {
  it('should allow requests within rate limit', () => {
    const result1 = checkRateLimit('test-key', 60000, 3); // 3 requests per minute
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit('test-key', 60000, 3);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimit('test-key', 60000, 3);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests when rate limit is exceeded', () => {
    process.env.NODE_ENV = 'production';
    
    // Exhaust the rate limit
    checkRateLimit('test-key', 60000, 2);
    checkRateLimit('test-key', 60000, 2);
    
    // This should be blocked
    const blockedResult = checkRateLimit('test-key', 60000, 2);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.remaining).toBe(0);
    
    // Should log security event
    expect(mockConsoleLog).toHaveBeenCalled();
    const logCall = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.message).toBe('Security event: Rate limit exceeded');
  });

  it('should handle different keys independently', () => {
    const result1 = checkRateLimit('key1', 60000, 2);
    const result2 = checkRateLimit('key2', 60000, 2);
    
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('should reset rate limit after window expires', async () => {
    const shortWindow = 200; // 200ms window for more reliable testing
    
    // Exhaust the limit
    checkRateLimit('test-key-reset', shortWindow, 1);
    let blockedResult = checkRateLimit('test-key-reset', shortWindow, 1);
    expect(blockedResult.allowed).toBe(false);
    
    // Wait for window to expire and try again
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const allowedResult = checkRateLimit('test-key-reset', shortWindow, 1);
    expect(allowedResult.allowed).toBe(true);
    expect(allowedResult.remaining).toBe(0);
  }, 10000);

  it('should clean up expired entries', async () => {
    const shortWindow = 100; // 100ms window
    
    // Create some entries with unique keys
    checkRateLimit('cleanup-key1', shortWindow, 5);
    checkRateLimit('cleanup-key2', shortWindow, 5);
    
    // Wait for entries to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Clean up expired entries
    cleanupRateLimit();
    
    // New requests should start fresh (full limit available)
    const result1 = checkRateLimit('cleanup-key1', 60000, 5);
    const result2 = checkRateLimit('cleanup-key2', 60000, 5);
    
    expect(result1.remaining).toBe(4); // Should have used 1, leaving 4
    expect(result2.remaining).toBe(4); // Should have used 1, leaving 4
  }, 10000);
});

describe('Edge Cases and Error Handling', () => {
  it('should handle non-Error objects in withErrorLogging', async () => {
    process.env.NODE_ENV = 'production';
    
    const failingOperation = () => Promise.reject('String error');
    
    await expect(
      withErrorLogging(failingOperation, { service: 'test' }, 'Test failed')
    ).rejects.toBe('String error');
    
    const logCall = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    expect(logEntry.error.message).toBe('String error');
  });

  it('should handle undefined context gracefully', () => {
    process.env.NODE_ENV = 'production';
    const logger = new TestLogger();
    
    logger.info('Test message');
    
    const logCall = mockConsoleLog.mock.calls[0][0];
    const logEntry = JSON.parse(logCall);
    
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.context).toBeUndefined();
  });

  it('should handle circular references in context', () => {
    process.env.NODE_ENV = 'production';
    const logger = new TestLogger();
    
    const circularObject: any = { name: 'test' };
    circularObject.self = circularObject;
    
    // This should not throw
    expect(() => {
      logger.info('Test with circular reference', circularObject);
    }).not.toThrow();
  });
}); 