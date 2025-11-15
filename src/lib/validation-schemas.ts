import { z } from 'zod';

// Dispensary Application Schema
export const dispensaryApplicationSchema = z.object({
  // Step 1: Business Details
  organizationName: z.string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(200, "Organization name must be less than 200 characters")
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Organization name contains invalid characters"),
  
  legalEntityName: z.string()
    .trim()
    .min(2, "Legal entity name must be at least 2 characters")
    .max(200, "Legal entity name must be less than 200 characters"),
  
  dbaName: z.string()
    .trim()
    .max(200, "DBA name must be less than 200 characters")
    .optional(),
  
  // Step 2: MCA License
  licenseType: z.enum(['dispensary', 'processor', 'grower', 'other'], {
    errorMap: () => ({ message: "Please select a valid license type" })
  }),
  
  licenseNumber: z.string()
    .trim()
    .min(3, "License number must be at least 3 characters")
    .max(50, "License number must be less than 50 characters")
    .regex(/^[A-Z0-9-]+$/i, "License number must contain only letters, numbers, and hyphens"),
  
  licenseIssueDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .refine((date) => new Date(date) <= new Date(), "Issue date cannot be in the future"),
  
  licenseExpiryDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .refine((date) => new Date(date) > new Date(), "License must not be expired"),
  
  // Step 3: Contact Information
  contactPerson: z.string()
    .trim()
    .min(2, "Contact person name must be at least 2 characters")
    .max(100, "Contact person name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  
  contactEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  contactPhone: z.string()
    .trim()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[\s.-]?([0-9]{3})[\s.-]?([0-9]{4})$/, 
      "Phone number must be a valid US format (e.g., (123) 456-7890)")
    .transform((phone) => phone.replace(/\D/g, '')),
  
  address: z.string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be less than 500 characters"),
  
  estimatedEmployees: z.coerce.number()
    .int("Must be a whole number")
    .min(1, "Must have at least 1 employee")
    .max(10000, "Employee count seems unrealistic"),
  
  preferredStartDate: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format")
    .refine((date) => new Date(date) >= new Date(), "Start date must be in the future"),
  
  // Step 4: Attestations
  complianceAffirmation: z.boolean().refine((val) => val === true, 
    "You must affirm compliance"),
  privacyAcknowledgment: z.boolean().refine((val) => val === true, 
    "You must acknowledge privacy policy"),
  trainingResponsibility: z.boolean().refine((val) => val === true, 
    "You must accept training responsibility"),
}).refine((data) => {
  // Cross-field validation: expiry must be after issue date
  return new Date(data.licenseExpiryDate) > new Date(data.licenseIssueDate);
}, {
  message: "License expiry date must be after issue date",
  path: ["licenseExpiryDate"]
});

// Manager Registration Schema
export const managerRegistrationSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Employee Registration Schema
export const employeeRegistrationSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters"),
  
  firstName: z.string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters"),
  
  lastName: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters"),
  
  phone: z.string()
    .trim()
    .regex(/^\+?1?\s*\(?([0-9]{3})\)?[\s.-]?([0-9]{3})[\s.-]?([0-9]{4})$/, 
      "Phone number must be a valid US format")
    .transform((phone) => phone.replace(/\D/g, '')),
  
  joinCode: z.string()
    .trim()
    .length(8, "Join code must be exactly 8 characters")
    .regex(/^[A-Z0-9]+$/i, "Join code must contain only letters and numbers")
    .optional()
});

// Staff Invitation Schema (for edge function)
export const staffInvitationSchema = z.object({
  action: z.enum(['invite_single', 'invite_bulk', 'resend_invitation', 'cancel_invitation']),
  organizationId: z.string().uuid("Invalid organization ID"),
  inviterId: z.string().uuid("Invalid inviter ID"),
  email: z.string().email().max(255).optional(),
  emails: z.array(z.string().email().max(255)).max(100, "Cannot invite more than 100 at once").optional(),
  role: z.enum(['student', 'training_coordinator', 'dispensary_manager']).optional(),
  invitationId: z.string().uuid().optional(),
  customMessage: z.string().max(1000, "Custom message must be less than 1000 characters").optional()
}).refine((data) => {
  // Ensure required fields based on action
  if (data.action === 'invite_single') return !!data.email;
  if (data.action === 'invite_bulk') return !!data.emails && data.emails.length > 0;
  if (data.action === 'resend_invitation' || data.action === 'cancel_invitation') return !!data.invitationId;
  return true;
}, {
  message: "Missing required fields for this action"
});

// Employee Invitation Schema (for send-employee-invitation)
export const employeeInvitationSchema = z.object({
  employeeEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase(),
  
  organizationName: z.string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(200, "Organization name must be less than 200 characters"),
  
  invitationToken: z.string()
    .trim()
    .min(10, "Invalid invitation token")
    .max(100, "Invalid invitation token"),
  
  deadline: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid deadline date")
    .refine((date) => new Date(date) > new Date(), "Deadline must be in the future")
});
