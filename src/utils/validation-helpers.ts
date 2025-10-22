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
): { valid: boolean; error?: string; warning?: string } => {
  if (!issueDate || !expiryDate) {
    return { valid: true }; // Allow empty if optional
  }
  
  const issue = new Date(issueDate);
  const expiry = new Date(expiryDate);
  const today = new Date();
  
  if (issue > today) {
    return { valid: false, error: "Issue date cannot be in the future" };
  }
  
  if (expiry <= issue) {
    return { valid: false, error: "Expiry date must be after issue date" };
  }
  
  // Soft warning if expiry is soon (less than 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  if (expiry < thirtyDaysFromNow) {
    return { 
      valid: true, 
      warning: "Note: License expires within 30 days. You may want to renew soon." 
    };
  }
  
  return { valid: true };
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
