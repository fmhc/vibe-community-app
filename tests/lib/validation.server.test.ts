import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  nameSchema,
  optionalNameSchema,
  experienceLevelSchema,
  githubUsernameSchema,
  linkedinUrlSchema,
  discordUsernameSchema,
  projectInterestSchema,
  projectDetailsSchema,
  communitySignupSchema,
  loginSchema,
  passwordSchema,
  validateFormData,
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
} from '~/lib/validation.server';

describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
    expect(emailSchema.parse('user.name+tag@domain.co.uk')).toBe('user.name+tag@domain.co.uk');
  });

  it('should reject invalid email addresses', () => {
    expect(() => emailSchema.parse('')).toThrow('Email is required');
    expect(() => emailSchema.parse('invalid')).toThrow('Please enter a valid email address');
    expect(() => emailSchema.parse('test@')).toThrow('Please enter a valid email address');
    expect(() => emailSchema.parse('@example.com')).toThrow('Please enter a valid email address');
  });

  it('should reject emails that are too long', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    expect(() => emailSchema.parse(longEmail)).toThrow('Email must be less than 255 characters');
  });
});

describe('Name Validation', () => {
  it('should validate correct names', () => {
    expect(nameSchema.parse('John Doe')).toBe('John Doe');
    expect(nameSchema.parse("Mary O'Connor")).toBe("Mary O'Connor");
    expect(nameSchema.parse('Jean-Pierre')).toBe('Jean-Pierre');
  });

  it('should reject invalid names', () => {
    expect(() => nameSchema.parse('')).toThrow('Name is required');
    expect(() => nameSchema.parse('John123')).toThrow('Name can only contain letters, spaces, hyphens, and apostrophes');
    expect(() => nameSchema.parse('John@Doe')).toThrow('Name can only contain letters, spaces, hyphens, and apostrophes');
  });

  it('should handle optional names correctly', () => {
    expect(optionalNameSchema.parse('')).toBe('');
    expect(optionalNameSchema.parse('John Doe')).toBe('John Doe');
    expect(optionalNameSchema.parse(undefined)).toBeUndefined();
  });
});

describe('Experience Level Validation', () => {
  it('should validate correct experience levels', () => {
    expect(experienceLevelSchema.parse(1)).toBe(1);
    expect(experienceLevelSchema.parse(50)).toBe(50);
    expect(experienceLevelSchema.parse(100)).toBe(100);
  });

  it('should reject invalid experience levels', () => {
    expect(() => experienceLevelSchema.parse(0)).toThrow('Experience level must be at least 1');
    expect(() => experienceLevelSchema.parse(101)).toThrow('Experience level must be at most 100');
    expect(() => experienceLevelSchema.parse(-5)).toThrow('Experience level must be at least 1');
  });
});

describe('GitHub Username Validation', () => {
  it('should validate correct GitHub usernames', () => {
    expect(githubUsernameSchema.parse('octocat')).toBe('octocat');
    expect(githubUsernameSchema.parse('test-user123')).toBe('test-user123');
    expect(githubUsernameSchema.parse('')).toBe('');
    expect(githubUsernameSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid GitHub usernames', () => {
    expect(() => githubUsernameSchema.parse('user_name')).toThrow('GitHub username can only contain letters, numbers, and hyphens');
    expect(() => githubUsernameSchema.parse('user.name')).toThrow('GitHub username can only contain letters, numbers, and hyphens');
    expect(() => githubUsernameSchema.parse('a'.repeat(40))).toThrow('GitHub username must be less than 39 characters');
  });
});

describe('LinkedIn URL Validation', () => {
  it('should validate correct LinkedIn URLs', () => {
    expect(linkedinUrlSchema.parse('https://linkedin.com/in/testuser')).toBe('https://linkedin.com/in/testuser');
    expect(linkedinUrlSchema.parse('https://www.linkedin.com/in/test-user')).toBe('https://www.linkedin.com/in/test-user');
    expect(linkedinUrlSchema.parse('')).toBe('');
    expect(linkedinUrlSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid LinkedIn URLs', () => {
    expect(() => linkedinUrlSchema.parse('https://github.com/user')).toThrow('URL must be a LinkedIn profile URL');
    expect(() => linkedinUrlSchema.parse('invalid-url')).toThrow('Please enter a valid LinkedIn URL');
    expect(() => linkedinUrlSchema.parse('https://facebook.com/user')).toThrow('URL must be a LinkedIn profile URL');
  });
});

describe('Discord Username Validation', () => {
  it('should validate correct Discord usernames', () => {
    expect(discordUsernameSchema.parse('user123')).toBe('user123');
    expect(discordUsernameSchema.parse('test.user_name')).toBe('test.user_name');
    expect(discordUsernameSchema.parse('')).toBe('');
    expect(discordUsernameSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid Discord usernames', () => {
    expect(() => discordUsernameSchema.parse('user-name')).toThrow('Discord username can only contain letters, numbers, dots, and underscores');
    expect(() => discordUsernameSchema.parse('user@name')).toThrow('Discord username can only contain letters, numbers, dots, and underscores');
    expect(() => discordUsernameSchema.parse('a'.repeat(35))).toThrow('Discord username must be less than 32 characters');
  });
});

describe('Project Details Validation', () => {
  it('should validate project interest and details', () => {
    expect(projectInterestSchema.parse('AI development')).toBe('AI development');
    expect(projectInterestSchema.parse('')).toBe('');
    
    const longDetails = 'A'.repeat(1500);
    expect(projectDetailsSchema.parse(longDetails)).toBe(longDetails);
  });

  it('should reject overly long project details', () => {
    const tooLongInterest = 'A'.repeat(501);
    const tooLongDetails = 'A'.repeat(2001);
    
    expect(() => projectInterestSchema.parse(tooLongInterest)).toThrow('Project interest must be less than 500 characters');
    expect(() => projectDetailsSchema.parse(tooLongDetails)).toThrow('Project details must be less than 2000 characters');
  });
});

describe('Password Validation', () => {
  it('should validate strong passwords', () => {
    expect(passwordSchema.parse('Password123')).toBe('Password123');
    expect(passwordSchema.parse('MyStr0ngP@ssw0rd')).toBe('MyStr0ngP@ssw0rd');
  });

  it('should reject weak passwords', () => {
    expect(() => passwordSchema.parse('weak')).toThrow('Password must be at least 8 characters');
    expect(() => passwordSchema.parse('password')).toThrow('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    expect(() => passwordSchema.parse('PASSWORD123')).toThrow('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    expect(() => passwordSchema.parse('Password')).toThrow('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  });

  it('should reject overly long passwords', () => {
    const tooLongPassword = 'A'.repeat(130) + 'a1';
    expect(() => passwordSchema.parse(tooLongPassword)).toThrow('Password must be less than 128 characters');
  });
});

describe('Community Signup Schema', () => {
  it('should validate complete valid signup data', () => {
    const validData = {
      email: 'test@example.com',
      name: 'John Doe',
      experienceLevel: 75,
      projectInterest: 'AI development',
      projectDetails: 'Building chatbots',
      githubUsername: 'johndoe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      discordUsername: 'john.doe'
    };

    expect(communitySignupSchema.parse(validData)).toEqual(validData);
  });

  it('should validate minimal valid signup data', () => {
    const minimalData = {
      email: 'test@example.com',
      name: '',
      experienceLevel: 50,
      projectInterest: '',
      projectDetails: '',
      githubUsername: '',
      linkedinUrl: '',
      discordUsername: ''
    };

    expect(communitySignupSchema.parse(minimalData)).toEqual(minimalData);
  });

  it('should reject invalid signup data', () => {
    const invalidData = {
      email: 'invalid-email',
      name: 'John123',
      experienceLevel: 150,
      githubUsername: 'user_with_underscore',
      linkedinUrl: 'https://github.com/user',
      discordUsername: 'user-with-dash'
    };

    expect(() => communitySignupSchema.parse(invalidData)).toThrow();
  });
});

describe('Login Schema', () => {
  it('should validate correct login data', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123',
      remember: true
    };

    expect(loginSchema.parse(loginData)).toEqual(loginData);
  });

  it('should validate login data without remember flag', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password'
    };

    expect(loginSchema.parse(loginData)).toEqual({
      email: 'test@example.com',
      password: 'password',
      remember: undefined
    });
  });
});

describe('Form Data Validation', () => {
  it('should validate form data correctly', () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('name', 'John Doe');
    formData.append('experienceLevel', '75');
    formData.append('projectInterest', 'AI development');

    const result = validateFormData(communitySignupSchema, formData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.experienceLevel).toBe(75);
      expect(result.data.projectInterest).toBe('AI development');
    }
  });

  it('should handle remember checkbox correctly', () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password');
    formData.append('remember', 'on');

    const result = validateFormData(loginSchema, formData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.remember).toBe(true);
    }
  });

  it('should return validation errors for invalid form data', () => {
    const formData = new FormData();
    formData.append('email', 'invalid-email');
    formData.append('name', 'John123');

    const result = validateFormData(communitySignupSchema, formData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty('email');
      expect(result.errors).toHaveProperty('name');
    }
  });
});

describe('Sanitization Functions', () => {
  describe('sanitizeString', () => {
    it('should remove control characters and normalize whitespace', () => {
      expect(sanitizeString('  hello   world  ')).toBe('hello world');
      expect(sanitizeString('text\x00with\x01control\x02chars')).toBe('textwithcontrolchars');
      expect(sanitizeString('multiple    spaces')).toBe('multiple spaces');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert email to lowercase and trim', () => {
      expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(sanitizeEmail('User.Name@Domain.Co.UK')).toBe('user.name@domain.co.uk');
    });
  });

  describe('sanitizeUrl', () => {
    it('should remove potentially dangerous characters', () => {
      expect(sanitizeUrl('https://example.com/<script>')).toBe('https://example.com/script');
      expect(sanitizeUrl('https://example.com/"alert(1)"')).toBe('https://example.com/alert(1)');
      expect(sanitizeUrl("https://example.com/'test'")).toBe('https://example.com/test');
    });
  });
});

describe('Edge Cases and Security', () => {
  it('should handle empty and null values gracefully', () => {
    expect(() => emailSchema.parse(null)).toThrow();
    expect(() => emailSchema.parse(undefined)).toThrow();
    expect(optionalNameSchema.parse('')).toBe('');
  });

  it('should prevent injection attempts in names', () => {
    expect(() => nameSchema.parse('<script>alert(1)</script>')).toThrow();
    expect(() => nameSchema.parse('DROP TABLE users;')).toThrow();
    expect(() => nameSchema.parse('${evil_code}')).toThrow();
  });

  it('should validate GitHub usernames against common attacks', () => {
    expect(() => githubUsernameSchema.parse('../../../etc/passwd')).toThrow();
    expect(() => githubUsernameSchema.parse('admin||1=1')).toThrow();
  });

  it('should validate LinkedIn URLs against XSS attempts', () => {
    expect(() => linkedinUrlSchema.parse('javascript:alert(1)')).toThrow();
    expect(() => linkedinUrlSchema.parse('https://evil.com/linkedin.com')).toThrow();
  });
}); 