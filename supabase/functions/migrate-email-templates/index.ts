import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateConfig {
  name: string;
  subject: string;
  variables: string[];
}

const TEMPLATES: TemplateConfig[] = [
  { 
    name: "welcome", 
    subject: "Welcome to ProCann Edu!", 
    variables: ["FirstName", "DashboardURL"] 
  },
  { 
    name: "certificate", 
    subject: "Your Certificate is Ready!", 
    variables: ["FirstName", "CertificateNumber", "DownloadURL"] 
  },
  { 
    name: "invite", 
    subject: "You're Invited to Join ProCann Edu", 
    variables: ["InviterName", "OrganizationName", "AcceptInvitationURL"] 
  },
  { 
    name: "confirm-signup", 
    subject: "Confirm Your Email Address", 
    variables: ["ConfirmationURL"] 
  },
  { 
    name: "reset-password", 
    subject: "Reset Your Password", 
    variables: ["ConfirmationURL"] 
  },
  { 
    name: "magic-link", 
    subject: "Your Login Link", 
    variables: ["ConfirmationURL"] 
  },
  { 
    name: "seat-purchase-confirmation", 
    subject: "Seat Purchase Confirmed", 
    variables: ["CoordinatorName", "QuantityPurchased", "TotalAmount", "OrderDate", "OrganizationName", "AssignSeatsURL", "AccessKey"] 
  },
  { 
    name: "application-approved", 
    subject: "Your Application Has Been Approved", 
    variables: ["ContactPerson", "OrganizationName", "AccessKey", "RegistrationURL"] 
  },
  { 
    name: "application-rejected", 
    subject: "Application Status Update", 
    variables: ["OrganizationName", "ContactPerson", "RejectionReason", "ReapplyURL"] 
  },
  { 
    name: "profile-change-alert", 
    subject: "Profile Change Alert", 
    variables: ["UserName", "ChangedAt", "FieldLabel", "OldValue", "NewValue", "AdminDashboardURL"] 
  },
  { 
    name: "change-email", 
    subject: "Confirm Your New Email Address", 
    variables: ["Email", "ConfirmationURL"] 
  },
  { 
    name: "training-coordinator-welcome", 
    subject: "Welcome, Training Coordinator!", 
    variables: ["CoordinatorName", "OrganizationName", "AvailableSeats", "DashboardURL"] 
  },
  { 
    name: "payment-confirmation", 
    subject: "Payment Confirmed - Start Your Training", 
    variables: ["FirstName", "CourseName", "PaymentMethod", "TransactionID", "PaymentDate", "Amount", "StartTrainingURL"] 
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const template of TEMPLATES) {
      try {
        // Read HTML file
        const filePath = `./email-templates/${template.name}.html`;
        let htmlContent: string;
        
        try {
          htmlContent = await Deno.readTextFile(filePath);
        } catch (readError) {
          console.error(`Failed to read ${filePath}:`, readError);
          errors.push(`Failed to read ${template.name}.html`);
          errorCount++;
          continue;
        }

        // Upsert template into database
        const { error } = await supabase.from("email_templates").upsert({
          template_name: template.name,
          subject_line: template.subject,
          html_content: htmlContent,
          variables: template.variables,
          version: 1,
          is_active: true,
        }, {
          onConflict: 'template_name'
        });
        
        if (error) {
          console.error(`Database error for ${template.name}:`, error);
          errors.push(`${template.name}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✓ Migrated template: ${template.name}`);
          successCount++;
        }
      } catch (templateError: any) {
        console.error(`Error processing ${template.name}:`, templateError);
        errors.push(`${template.name}: ${templateError.message}`);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: errorCount === 0,
        message: `Migrated ${successCount} templates${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
