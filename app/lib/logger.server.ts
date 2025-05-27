// Structured logging utility for better error handling and monitoring

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  service?: string;
  method?: string;
  userId?: string;
  email?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private currentLevel: LogLevel;
  
  constructor() {
    // Set log level based on environment
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
  
  private createLogEntry(
    level: LogLevel, 
    message: string, 
    context?: LogContext, 
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    
    if (context) {
      entry.context = { ...context };
      // Sanitize sensitive data
      if (entry.context.password) delete entry.context.password;
      if (entry.context.token) entry.context.token = '[REDACTED]';
    }
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    return entry;
  }
  
  private output(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    
    if (process.env.NODE_ENV === 'production') {
      // In production, output structured JSON for log aggregation
      // Handle circular references safely
      try {
        console.log(JSON.stringify(entry));
      } catch (error) {
        // If there's a circular reference, create a safe version
        const safeEntry = {
          ...entry,
          context: entry.context ? JSON.parse(JSON.stringify(entry.context, this.circularReplacer())) : undefined
        };
        console.log(JSON.stringify(safeEntry));
      }
    } else {
      // In development, output human-readable format
      const timestamp = entry.timestamp.split('T')[1].split('.')[0];
      let contextStr = '';
      if (entry.context) {
        try {
          contextStr = ` [${JSON.stringify(entry.context)}]`;
        } catch (error) {
          contextStr = ` [${JSON.stringify(entry.context, this.circularReplacer())}]`;
        }
      }
      const errorStr = entry.error ? `\nError: ${entry.error.message}${entry.error.stack ? '\n' + entry.error.stack : ''}` : '';
      
      console.log(`[${timestamp}] ${levelName}: ${entry.message}${contextStr}${errorStr}`);
    }
  }

  private circularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  }
  
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.output(entry);
  }
  
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.output(entry);
  }
  
  warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.createLogEntry(LogLevel.WARN, message, context, error);
    this.output(entry);
  }
  
  error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.output(entry);
  }
  
  // Helper method for logging service operations
  serviceCall(
    service: string, 
    method: string, 
    message: string, 
    context?: Omit<LogContext, 'service' | 'method'>
  ): void {
    this.info(message, { service, method, ...context });
  }
  
  // Helper method for logging service errors
  serviceError(
    service: string, 
    method: string, 
    message: string, 
    error?: Error,
    context?: Omit<LogContext, 'service' | 'method'>
  ): void {
    this.error(message, { service, method, ...context }, error);
  }
  
  // Helper method for request logging
  request(
    method: string,
    path: string,
    context?: LogContext
  ): void {
    this.info(`${method} ${path}`, {
      requestType: 'incoming',
      ...context
    });
  }
  
  // Helper method for security events
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    const entry = this.createLogEntry(level, `Security event: ${event}`, {
      securityEvent: true,
      severity,
      ...context
    });
    this.output(entry);
  }
  
  // Helper method for performance logging
  performance(
    operation: string,
    duration: number,
    context?: LogContext
  ): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    const entry = this.createLogEntry(level, `Performance: ${operation} took ${duration}ms`, {
      performanceMetric: true,
      operation,
      duration,
      ...context
    });
    if (this.shouldLog(level)) {
      this.output(entry);
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Utility function to extract request context
export function getRequestContext(request: Request): LogContext {
  const url = new URL(request.url);
  
  // Extract the real IP from headers
  let ip = 'unknown';
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one
    ip = xForwardedFor.split(',')[0].trim();
  } else {
    ip = request.headers.get('X-Real-IP') || 'unknown';
  }
  
  return {
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get('User-Agent') || undefined,
    ip,
  };
}

// Error handling wrapper for async operations
export async function withErrorLogging<T>(
  operation: () => Promise<T>,
  context: LogContext,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 1000) {
      logger.performance(context.method || 'unknown', duration, context);
    }
    
    return result;
  } catch (error) {
    logger.serviceError(
      context.service || 'unknown',
      context.method || 'unknown',
      errorMessage,
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    throw error;
  }
}

// Rate limiting storage (simple in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Simple rate limiting implementation
export function checkRateLimit(
  key: string,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxAttempts: number = 5
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const stored = rateLimitStore.get(key);
  
  // Clean up expired entries
  if (stored && now > stored.resetTime) {
    rateLimitStore.delete(key);
  }
  
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
  
  if (current.count >= maxAttempts) {
    logger.security('Rate limit exceeded', 'medium', { 
      rateLimitKey: key,
      attempts: current.count,
      maxAttempts
    });
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime: current.resetTime
  };
}

// Cleanup function for rate limit store (should be called periodically)
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
} 