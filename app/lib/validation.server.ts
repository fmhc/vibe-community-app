import { z } from 'zod';

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

// Name validation schema
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Optional name schema (for cases where name is not required)
export const optionalNameSchema = z
  .string()
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-']*$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .optional()
  .or(z.literal(''));

// Experience level validation
export const experienceLevelSchema = z
  .number()
  .min(1, 'Experience level must be at least 1')
  .max(100, 'Experience level must be at most 100');

// URL validation schemas
export const githubUsernameSchema = z
  .string()
  .max(39, 'GitHub username must be less than 39 characters')
  .regex(/^[a-zA-Z0-9\-]+$/, 'GitHub username can only contain letters, numbers, and hyphens')
  .optional()
  .or(z.literal(''));

export const linkedinUrlSchema = z
  .string()
  .url('Please enter a valid LinkedIn URL')
  .refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'linkedin.com' || urlObj.hostname === 'www.linkedin.com';
      } catch {
        return false;
      }
    },
    'URL must be a LinkedIn profile URL'
  )
  .optional()
  .or(z.literal(''));

export const discordUsernameSchema = z
  .string()
  .max(32, 'Discord username must be less than 32 characters')
  .regex(/^[a-zA-Z0-9._]+$/, 'Discord username can only contain letters, numbers, dots, and underscores')
  .optional()
  .or(z.literal(''));

// Project details validation
export const projectInterestSchema = z
  .string()
  .max(500, 'Project interest must be less than 500 characters')
  .optional()
  .or(z.literal(''));

export const projectDetailsSchema = z
  .string()
  .max(2000, 'Project details must be less than 2000 characters')
  .optional()
  .or(z.literal(''));

// Community signup form schema
export const communitySignupSchema = z.object({
  email: emailSchema,
  name: optionalNameSchema,
  experienceLevel: experienceLevelSchema,
  projectInterest: projectInterestSchema,
  projectDetails: projectDetailsSchema,
  githubUsername: githubUsernameSchema,
  linkedinUrl: linkedinUrlSchema,
  discordUsername: discordUsernameSchema,
});

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

// Password validation schema (for registration/reset)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Validation result types
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: Record<string, string>;
};

// Validation utility functions
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData
): ValidationResult<T> {
  try {
    // Convert FormData to object
    const data: Record<string, any> = {};
    
    for (const [key, value] of formData.entries()) {
      if (key === 'experienceLevel') {
        data[key] = parseInt(value as string) || 50;
      } else if (key === 'remember') {
        data[key] = value === 'on';
      } else {
        data[key] = value;
      }
    }
    
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    
    return { 
      success: false, 
      errors: { _form: 'Validation failed' } 
    };
  }
}

// Sanitization utilities
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeUrl(url: string): string {
  return url.trim().replace(/[<>"']/g, ''); // Remove potential XSS characters
}

// Rate limiting utility types
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
}

// Individual field validation utility
export interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export interface FieldValidationResult {
  isValid: boolean;
  value: string;
  error?: string;
}

export function validateInput(
  input: string | null | undefined,
  type: 'string' | 'email' | 'url' = 'string',
  options: ValidationOptions = {}
): FieldValidationResult {
  const value = (input || '').toString().trim();
  
  // Check if required
  if (options.required && !value) {
    return {
      isValid: false,
      value: '',
      error: 'This field is required'
    };
  }
  
  // If not required and empty, return valid
  if (!options.required && !value) {
    return {
      isValid: true,
      value: ''
    };
  }
  
  // Check length constraints
  if (options.minLength && value.length < options.minLength) {
    return {
      isValid: false,
      value,
      error: `Must be at least ${options.minLength} characters`
    };
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    return {
      isValid: false,
      value,
      error: `Must be no more than ${options.maxLength} characters`
    };
  }
  
  // Type-specific validation
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          isValid: false,
          value,
          error: 'Please enter a valid email address'
        };
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return {
          isValid: false,
          value,
          error: 'Please enter a valid URL'
        };
      }
      break;
  }
  
  // Pattern validation
  if (options.pattern && !options.pattern.test(value)) {
    return {
      isValid: false,
      value,
      error: 'Invalid format'
    };
  }
  
  return {
    isValid: true,
    value: sanitizeString(value)
  };
} 