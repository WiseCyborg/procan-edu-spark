import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove any HTML tags and potentially malicious content
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] 
  });
  
  // Trim whitespace
  return cleaned.trim();
}

/**
 * Sanitize an entire form data object
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeFormData(value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize email specifically (lowercase, trim, remove non-email chars)
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/gi, '');
}

/**
 * Sanitize phone number (remove all non-digits except leading +)
 */
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\\d+]/g, '');
  // Keep only + at the start
  return cleaned.replace(/\+/g, (match, offset) => offset === 0 ? match : '');
}
