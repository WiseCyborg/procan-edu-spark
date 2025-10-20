import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
  { name: "welcome", subject: "Welcome to ProCann Edu!", variables: ["FirstName", "DashboardURL"] },
  { name: "certificate", subject: "🎉 Your Certificate is Ready!", variables: ["FirstName", "CourseTitle", "CertificateNumber", "IssueDate", "DownloadURL"] },
  { name: "invite", subject: "You're Invited to Join {{ .OrganizationName }}", variables: ["InviteeName", "InviterName", "OrganizationName", "Role", "CustomMessage", "AcceptInvitationURL", "ExpiryDate"] },
  { name: "confirm-signup", subject: "Confirm Your Email Address", variables: ["FirstName", "ConfirmationURL"] },
  { name: "reset-password", subject: "Reset Your Password", variables: ["ConfirmationURL"] },
  { name: "magic-link", subject: "Your Sign-In Link", variables: ["ConfirmationURL"] },
  { name: "seat-purchase-confirmation", subject: "Seat Purchase Confirmed", variables: ["CoordinatorName", "QuantityPurchased", "TotalAmount", "OrderDate", "OrganizationName", "AssignSeatsURL", "AccessKey"] },
  { name: "application-approved", subject: "🎉 Your Application Has Been Approved!", variables: ["ContactPerson", "OrganizationName", "AccessKey", "RegistrationURL"] },
  { name: "application-rejected", subject: "Update on Your Application", variables: ["OrganizationName", "ContactPerson", "RejectionReason", "ReapplyURL"] },
  { name: "profile-change-alert", subject: "🔔 Critical Profile Change Alert", variables: ["UserName", "ChangedAt", "FieldLabel", "OldValue", "NewValue", "AdminDashboardURL"] },
  { name: "change-email", subject: "Confirm Your New Email Address", variables: ["Email", "ConfirmationURL"] },
  { name: "training-coordinator-welcome", subject: "Welcome, Training Coordinator!", variables: ["CoordinatorName", "OrganizationName", "AvailableSeats", "EmployeeCount", "DashboardURL"] },
  { name: "payment-confirmation", subject: "Payment Confirmation", variables: ["FirstName", "CourseName", "PaymentMethod", "TransactionId", "PaymentDate", "Amount", "Email", "DashboardURL"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting email template migration...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get admin user ID
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token || "");

    if (!user) {
      throw new Error("Unauthorized");
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const template of TEMPLATES) {
      try {
        // Read template file
        const templatePath = `../../email-templates/${template.name}.html`;
        const htmlContent = await Deno.readTextFile(
          new URL(templatePath, import.meta.url)
        );

        // Check if template already exists
        const { data: existing } = await supabase
          .from("email_templates")
          .select("id")
          .eq("template_name", template.name)
          .single();

        if (existing) {
          // Update existing template
          const { error } = await supabase
            .from("email_templates")
            .update({
              subject_line: template.subject,
              html_content: htmlContent,
              variables: template.variables,
              updated_by: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
          console.log(`Updated template: ${template.name}`);
        } else {
          // Insert new template
          const { error } = await supabase
            .from("email_templates")
            .insert({
              template_name: template.name,
              subject_line: template.subject,
              html_content: htmlContent,
              variables: template.variables,
              version: 1,
              is_active: true,
              created_by: user.id,
              updated_by: user.id,
            });

          if (error) throw error;
          console.log(`Inserted template: ${template.name}`);
        }

        successCount++;
      } catch (error: any) {
        console.error(`Error processing template ${template.name}:`, error);
        errors.push(`${template.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`Migration complete. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        message: `Migrated ${successCount} templates successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: errorCount === 0 ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
