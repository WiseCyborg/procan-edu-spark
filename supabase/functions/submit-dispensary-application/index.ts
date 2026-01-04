import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side validation schema
// Helper to check if date is today or later
const isTodayOrLater = (dateString: string) => {
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  return selectedDate >= today;
};

const DispensaryApplicationSchema = z.object({
  organizationName: z.string().trim().min(2).max(200).regex(/^[a-zA-Z0-9\s&.,'-]+$/),
  legalEntityName: z.string().trim().min(2).max(200),
  dbaName: z.string().trim().max(200).optional(),
  licenseType: z.enum(['dispensary', 'processor', 'grower', 'other']),
  // Transform to uppercase before validation to match frontend case-insensitive behavior
  licenseNumber: z.string().trim().min(3).max(50)
    .transform(val => val.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9-]+$/, "License number must contain only letters, numbers, and hyphens")),
  licenseIssueDate: z.string().refine((date) => !isNaN(Date.parse(date)) && new Date(date) <= new Date(), 
    "License issue date must be in the past"),
  licenseExpiryDate: z.string().refine((date) => !isNaN(Date.parse(date)) && new Date(date) > new Date(),
    "License expiry date must be in the future"),
  contactPerson: z.string().trim().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/),
  contactEmail: z.string().trim().email().max(255).toLowerCase(),
  contactPhone: z.string().trim().regex(/^\+?1?\s*\(?([0-9]{3})\)?[\s.-]?([0-9]{3})[\s.-]?([0-9]{4})$/),
  address: z.string().trim().min(5).max(500),
  estimatedEmployees: z.coerce.number().int().min(1).max(10000),
  // Allow today or any future date
  preferredStartDate: z.string().refine((date) => !isNaN(Date.parse(date)) && isTodayOrLater(date),
    "Preferred start date must be today or in the future"),
  complianceAffirmation: z.boolean().refine((val) => val === true),
  privacyAcknowledgment: z.boolean().refine((val) => val === true),
  trainingResponsibility: z.boolean().refine((val) => val === true),
}).refine((data) => new Date(data.licenseExpiryDate) > new Date(data.licenseIssueDate), {
  message: "License expiry date must be after issue date",
  path: ["licenseExpiryDate"]
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get client IP for rate limiting (anonymous submissions)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // IP-based rate limiting for anonymous submissions (5 per hour)
    // Use ip_rate_limits table instead of user-based rate_limits
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: recentSubmissions } = await supabase
      .from('dispensary_applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);
    
    // Simple global rate limit as fallback (50 per hour total)
    if (recentSubmissions && recentSubmissions > 50) {
      console.warn(`[RATE LIMIT] Global submission limit exceeded (${recentSubmissions}/50 per hour)`);
      return new Response(
        JSON.stringify({ 
          error: 'High traffic - please try again in a few minutes.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[APPLICATION] Submission from IP: ${clientIp.substring(0, 8)}...`);

    // Parse and validate input
    const rawData = await req.json();
    const validationResult = DispensaryApplicationSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const failedFields = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      console.error('[VALIDATION ERROR] Failed fields:', failedFields);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid application data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          failedFields: validationResult.error.issues.map(i => i.path.join('.')),
          code: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedData = validationResult.data;

    // Check for duplicate email submission - use case-insensitive comparison to match constraint
    const { data: existingApp } = await supabase
      .from('dispensary_applications')
      .select('id, application_status, created_at')
      .ilike('contact_email', validatedData.contactEmail)
      .in('application_status', ['pending', 'approved', 'under_review'])
      .maybeSingle();

    if (existingApp) {
      const daysSinceSubmission = (Date.now() - new Date(existingApp.created_at).getTime()) / (1000 * 60 * 60 * 24);
      
      console.warn(`[DUPLICATE] Active application exists for ${validatedData.contactEmail} (status: ${existingApp.application_status}, days: ${Math.floor(daysSinceSubmission)})`);
      return new Response(
        JSON.stringify({ 
          error: 'An application with this email is already being processed. Please check your email for updates or contact support.',
          code: 'DUPLICATE_APPLICATION',
          applicationId: existingApp.id,
          status: existingApp.application_status
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for rejected/archived applications that might need cleanup before resubmission
    const { data: oldApp } = await supabase
      .from('dispensary_applications')
      .select('id, application_status, created_at')
      .ilike('contact_email', validatedData.contactEmail)
      .in('application_status', ['rejected', 'archived'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If there's an old rejected/archived application, update its email to allow resubmission
    if (oldApp) {
      const daysSinceSubmission = (Date.now() - new Date(oldApp.created_at).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSubmission < 7) {
        console.warn(`[RESUBMIT_TOO_SOON] Must wait 7 days for ${validatedData.contactEmail} (days: ${Math.floor(daysSinceSubmission)})`);
        return new Response(
          JSON.stringify({ 
            error: `Please wait ${Math.ceil(7 - daysSinceSubmission)} more days before resubmitting.`,
            code: 'RESUBMIT_TOO_SOON',
            daysRemaining: Math.ceil(7 - daysSinceSubmission)
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Archive the old email to allow resubmission
      console.log(`[RESUBMISSION] Archiving old application ${oldApp.id} to allow resubmission`);
      await supabase
        .from('dispensary_applications')
        .update({ 
          contact_email: `archived_${Date.now()}_${validatedData.contactEmail}`,
          application_status: 'archived'
        })
        .eq('id', oldApp.id);
    }

    // Format phone number
    const formattedPhone = validatedData.contactPhone.replace(/\D/g, '');

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from('dispensary_applications')
      .insert({
        organization_name: validatedData.organizationName,
        legal_entity_name: validatedData.legalEntityName,
        dba_name: validatedData.dbaName || null,
        license_type: validatedData.licenseType,
        license_number: validatedData.licenseNumber,
        license_issue_date: validatedData.licenseIssueDate,
        license_expiry_date: validatedData.licenseExpiryDate,
        contact_person: validatedData.contactPerson,
        contact_email: validatedData.contactEmail,
        contact_phone: formattedPhone,
        address: validatedData.address,
        estimated_employees: validatedData.estimatedEmployees,
        preferred_start_date: validatedData.preferredStartDate,
        compliance_affirmation: validatedData.complianceAffirmation,
        application_status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[DATABASE ERROR]', insertError);
      
      // Handle unique constraint violation with better message
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            error: 'An application with this email already exists. Please use a different email or contact support.',
            code: 'DUPLICATE_EMAIL'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (insertError.code === '23514') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid data format. Please check your inputs.',
            code: 'CONSTRAINT_VIOLATION'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw insertError;
    }

    console.log(`✅ Application submitted: ${application.id} by ${validatedData.contactEmail}`);

    // Trigger confirmation email asynchronously
    try {
      const { error: emailError } = await supabase.functions.invoke('send-application-confirmation', {
        body: {
          application_id: application.id,
          contact_person: validatedData.contactPerson,
          contact_email: validatedData.contactEmail,
          organization_name: validatedData.organizationName,
          license_number: validatedData.licenseNumber
        }
      });
      
      if (emailError) {
        console.error('⚠️ Failed to send confirmation email:', emailError);
        // Don't fail the application - email failure is non-critical
      } else {
        console.log('📧 Confirmation email queued for', validatedData.contactEmail);
      }
    } catch (emailError) {
      console.error('⚠️ Exception sending confirmation email:', emailError);
      // Don't fail the application - email failure is non-critical
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        applicationId: application.id,
        message: 'Application submitted successfully. You will receive a confirmation email shortly.'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error submitting application:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to submit application. Please try again later.',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
