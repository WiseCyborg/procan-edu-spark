import { supabase } from "@/integrations/supabase/client";

interface AdminUserCreateParams {
  email: string;
  password: string;
  metadata?: Record<string, any>;
  organizationId?: string;
  role?: string;
}

interface AdminUserUpdateParams {
  userId: string;
  email?: string;
  password?: string;
  metadata?: Record<string, any>;
}

interface AdminUserResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Secure Admin User Management Service
 * 
 * Uses edge function with server-side admin role verification
 * instead of client-side supabase.auth.admin.* calls.
 * 
 * All operations are audited in admin_operations_audit table.
 */
export class SecureAdminUserService {
  /**
   * Create a new user account (admin only)
   */
  static async createUser(params: AdminUserCreateParams): Promise<AdminUserResult> {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "create",
          email: params.email,
          password: params.password,
          metadata: params.metadata,
          organizationId: params.organizationId,
          role: params.role,
        },
      });

      if (error) {
        console.error("Admin create user error:", error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to create user" };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Admin create user exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(userId: string): Promise<AdminUserResult> {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "get",
          userId,
        },
      });

      if (error) {
        console.error("Admin get user error:", error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to get user" };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Admin get user exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all users (admin only)
   */
  static async listUsers(): Promise<AdminUserResult> {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "list",
        },
      });

      if (error) {
        console.error("Admin list users error:", error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to list users" };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Admin list users exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user by ID (admin only)
   */
  static async deleteUser(userId: string): Promise<AdminUserResult> {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "delete",
          userId,
        },
      });

      if (error) {
        console.error("Admin delete user error:", error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to delete user" };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Admin delete user exception:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user by ID (admin only)
   */
  static async updateUser(params: AdminUserUpdateParams): Promise<AdminUserResult> {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: {
          action: "update",
          userId: params.userId,
          email: params.email,
          password: params.password,
          metadata: params.metadata,
        },
      });

      if (error) {
        console.error("Admin update user error:", error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || "Failed to update user" };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Admin update user exception:", error);
      return { success: false, error: error.message };
    }
  }
}
