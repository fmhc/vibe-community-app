import { randomBytes } from 'crypto';
import { logger } from './logger.server';

// Security headers configuration
export const securityHeaders = {
  // Prevent the page from being embedded in frames (clickjacking protection)
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filtering
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent embedding in other sites
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Content Security Policy (adjusted for vaporwave app)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://www.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // HSTS (only in production with HTTPS)
  ...(process.env.NODE_ENV === 'production' ? {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  } : {})
};

// CSRF token management
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_FORM_FIELD = '_csrf';
const CSRF_TOKEN_LENGTH = 32;

// In-memory CSRF token store (for production, use Redis or database)
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

export function storeCSRFToken(sessionId: string, token: string, expiresInMs: number = 3600000): void {
  csrfTokenStore.set(sessionId, {
    token,
    expires: Date.now() + expiresInMs
  });
  
  // Clean up expired tokens
  cleanupExpiredCSRFTokens();
}

export function validateCSRFToken(sessionId: string, providedToken: string): boolean {
  const stored = csrfTokenStore.get(sessionId);
  
  if (!stored) {
    logger.security('CSRF token validation failed - no stored token', 'medium', {
      sessionId: sessionId.substring(0, 8) + '***',
      hasProvidedToken: !!providedToken
    });
    return false;
  }
  
  if (Date.now() > stored.expires) {
    csrfTokenStore.delete(sessionId);
    logger.security('CSRF token validation failed - token expired', 'medium', {
      sessionId: sessionId.substring(0, 8) + '***'
    });
    return false;
  }
  
  const isValid = stored.token === providedToken;
  
  if (!isValid) {
    logger.security('CSRF token validation failed - token mismatch', 'high', {
      sessionId: sessionId.substring(0, 8) + '***',
      providedTokenLength: providedToken?.length || 0,
      storedTokenLength: stored.token.length
    });
  }
  
  return isValid;
}

export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (now > data.expires) {
      csrfTokenStore.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.debug(`Cleaned up ${cleanedCount} expired CSRF tokens`);
  }
}

// Helper function to extract CSRF token from request
export function extractCSRFToken(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  if (headerToken) {
    return headerToken;
  }
  
  // For form submissions, we'll need to parse form data
  // This is handled in the validation middleware
  return null;
}

// Input sanitization utilities
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove potentially dangerous tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim();
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .substring(0, 255); // Limit length
}

// IP address utilities
export function getClientIP(request: Request): string {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback - this might be a proxy IP in production
  return 'unknown';
}

// Secure session ID generation
export function generateSecureSessionId(): string {
  return randomBytes(32).toString('hex');
}

// Password security utilities
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');
  
  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain special characters');
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }
  
  if (/^(password|123456|qwerty|admin)/i.test(password)) {
    score -= 2;
    feedback.push('Avoid common passwords');
  }
  
  return {
    isValid: score >= 4,
    score: Math.max(0, score),
    feedback
  };
}

// Security event logging helper
export function logSecurityEvent(
  event: string, 
  severity: 'low' | 'medium' | 'high' | 'critical',
  request: Request,
  additionalContext?: Record<string, any>
): void {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  const url = new URL(request.url);
  
  logger.security(event, severity, {
    ip: clientIP,
    userAgent,
    method: request.method,
    path: url.pathname,
    ...additionalContext
  });
}

// Environment-specific security configurations
export const securityConfig = {
  // CSRF protection
  csrf: {
    enabled: true,
    tokenLength: CSRF_TOKEN_LENGTH,
    expiresInMs: 3600000, // 1 hour
  },
  
  // Rate limiting
  rateLimit: {
    signup: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 3,
    },
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
    },
  },
  
  // Session security
  session: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
}; 