import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminUserRequest {
  action: "create" | "get" | "list" | "delete" | "update";
  email?: string;
  password?: string;
  userId?: string;
  metadata?: Record<string, any>;
  organizationId?: string;
  role?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🔐 [ADMIN-USER-MANAGEMENT] Request received");

  try {
    // Step 1: Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with caller's JWT to verify their identity
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    
    if (authError || !caller) {
      console.error("❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📍 Caller: ${caller.email} (${caller.id})`);

    // Step 2: Verify caller has admin role using the user_roles table
    const { data: roles, error: roleError } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    if (roleError) {
      console.error("❌ Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = roles?.some(r => r.role === "admin");
    
    if (!isAdmin) {
      console.error(`❌ User ${caller.email} is not an admin. Roles: ${JSON.stringify(roles)}`);
      
      // Log unauthorized attempt
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await adminClient.from("admin_operations_audit").insert({
        operation_type: "UNAUTHORIZED_ATTEMPT",
        performed_by: caller.id,
        metadata: { attempted_action: "admin_user_management" },
        success: false,
        error_message: "User is not an admin",
      });
      
      return new Response(
        JSON.stringify({ error: "Forbidden - admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Admin verified: ${caller.email}`);

    // Step 3: Parse the request
    const body: AdminUserRequest = await req.json();
    const { action, email, password, userId, metadata, organizationId, role } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Create admin client with service role key for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let result: any = null;
    let operationType = action.toUpperCase();

    // Step 5: Execute the requested action
    switch (action) {
      case "create": {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email and password required for create" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`📧 Creating user: ${email}`);

        // Create auth user
        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: metadata || {},
        });

        if (createError) {
          throw createError;
        }

        // If organizationId provided, update profile
        if (organizationId && authData.user) {
          await adminClient.from("profiles").update({
            organization_id: organizationId,
          }).eq("user_id", authData.user.id);
        }

        // If role provided, assign it
        if (role && authData.user) {
          await adminClient.from("user_roles").upsert({
            user_id: authData.user.id,
            role: role,
          }, { onConflict: "user_id,role" });
        }

        result = { userId: authData.user?.id, email: authData.user?.email };
        console.log(`✅ User created: ${email}`);
        break;
      }

      case "get": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId required for get" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`🔍 Getting user: ${userId}`);

        const { data: authData, error: getError } = await adminClient.auth.admin.getUserById(userId);

        if (getError) {
          throw getError;
        }

        // Also get profile data
        const { data: profile } = await adminClient
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        result = {
          userId: authData.user?.id,
          email: authData.user?.email,
          createdAt: authData.user?.created_at,
          profile,
        };
        break;
      }

      case "list": {
        console.log(`📋 Listing users`);

        // Get users from auth
        const { data: authData, error: listError } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 100,
        });

        if (listError) {
          throw listError;
        }

        // Get profiles for context
        const userIds = authData.users.map(u => u.id);
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, first_name, last_name, email, organization_id")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        result = authData.users.map(u => ({
          userId: u.id,
          email: u.email,
          createdAt: u.created_at,
          profile: profileMap.get(u.id),
        }));
        break;
      }

      case "delete": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId required for delete" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`🗑️ Deleting user: ${userId}`);

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteError) {
          throw deleteError;
        }

        result = { deleted: true, userId };
        console.log(`✅ User deleted: ${userId}`);
        break;
      }

      case "update": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId required for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`✏️ Updating user: ${userId}`);

        const updateData: any = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (metadata) updateData.user_metadata = metadata;

        const { data: authData, error: updateError } = await adminClient.auth.admin.updateUserById(
          userId,
          updateData
        );

        if (updateError) {
          throw updateError;
        }

        result = { userId: authData.user?.id, email: authData.user?.email };
        console.log(`✅ User updated: ${userId}`);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Step 6: Audit log the successful operation
    await adminClient.from("admin_operations_audit").insert({
      operation_type: operationType,
      performed_by: caller.id,
      target_user_id: userId || result?.userId,
      target_email: email || result?.email,
      metadata: { action, organizationId, role },
      success: true,
    });

    console.log(`📝 Audit logged: ${operationType}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error:", error);

    // Try to audit log the failure
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await adminClient.from("admin_operations_audit").insert({
        operation_type: "ERROR",
        performed_by: "00000000-0000-0000-0000-000000000000",
        error_message: error.message,
        success: false,
      });
    } catch (auditError) {
      console.error("Failed to audit log error:", auditError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
