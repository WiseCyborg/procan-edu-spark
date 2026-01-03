/**
 * Validation helper functions for forms
 */

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export const formatZipCode = (value: string): string => {
  // Remove all non-digits
  const cleaned = value.replace(/\D/g, '');
  
  // Format as XXXXX or XXXXX-XXXX
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}`;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};

export const validateDateOfBirth = (dob: string): { valid: boolean; error?: string } => {
  if (!dob) return { valid: true }; // Optional field
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (birthDate > today) {
    return { valid: false, error: "Date of birth cannot be in the future" };
  }
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return { valid: false, error: "You must be at least 18 years old" };
  }
  
  if (age > 120) {
    return { valid: false, error: "Please enter a valid date of birth" };
  }
  
  return { valid: true };
};

export const validateDateRange = (
  issueDate: string, 
  expiryDate: string
): { valid: boolean; error?: string; warnings: string[] } => {
  if (!issueDate || !expiryDate) {
    return { valid: true, warnings: [] };
  }
  
  const issue = new Date(issueDate);
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warnings: string[] = [];

  // ONLY block if expired
  if (expiry < today) {
    return {
      valid: false,
      error: "License has expired. Please renew your license before applying.",
      warnings: []
    };
  }

  // Issue date in future is suspicious but don't block
  if (issue > today) {
    warnings.push("License issue date is in the future. Please verify the date.");
  }

  // Expiry same as or before issue is unusual but don't block
  if (expiry <= issue) {
    warnings.push("License expiry date is same as or before issue date. This is unusual.");
  }

  // Expiring soon - warn but don't block
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 30) {
    warnings.push(`License expires in ${daysUntilExpiry} days. Consider renewing soon.`);
  }

  return {
    valid: true,
    warnings
  };
};

export const sanitizeProfileData = (data: any) => {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim() || null;
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Normalize Maryland cannabis license number to standard format: DA-YY-#####
 * Accepts loose input like "da2300089", "DA-23-89", "DA 23 00089"
 * Returns normalized format or original if cannot parse
 */
export const normalizeMarylandLicense = (input: string): string => {
  if (!input) return '';
  
  // Uppercase and remove extra whitespace
  let cleaned = input.toUpperCase().trim();
  
  // Remove all separators first to get raw characters
  const raw = cleaned.replace(/[\s\-\/\\._]+/g, '');
  
  // Try pattern: TYPE(2 letters) + YY(2 digits) + SEQ(1-5 digits)
  // Examples: DA2300089, GA2500001
  const rawMatch = raw.match(/^(DA|GA|PA)(\d{2})(\d{1,5})$/);
  if (rawMatch) {
    const [, type, year, seq] = rawMatch;
    const paddedSeq = seq.padStart(5, '0');
    return `${type}-${year}-${paddedSeq}`;
  }
  
  // Try already-formatted with dashes: DA-23-00089 or DA-23-89
  const dashMatch = cleaned.match(/^(DA|GA|PA)-(\d{2})-(\d{1,5})$/);
  if (dashMatch) {
    const [, type, year, seq] = dashMatch;
    const paddedSeq = seq.padStart(5, '0');
    return `${type}-${year}-${paddedSeq}`;
  }
  
  // Return cleaned version if no match (will fail validation)
  return cleaned;
};
