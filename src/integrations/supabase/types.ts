export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          created_at: string
          exam_attempt_id: string
          expiry_date: string | null
          id: string
          is_revoked: boolean | null
          issue_date: string
          pdf_url: string | null
          tier_badge: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          created_at?: string
          exam_attempt_id: string
          expiry_date?: string | null
          id?: string
          is_revoked?: boolean | null
          issue_date?: string
          pdf_url?: string | null
          tier_badge?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          created_at?: string
          exam_attempt_id?: string
          expiry_date?: string | null
          id?: string
          is_revoked?: boolean | null
          issue_date?: string
          pdf_url?: string | null
          tier_badge?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          clicked_at: string | null
          communication_type: string
          content: string | null
          created_at: string
          delivery_status: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          organization_id: string | null
          recipient_email: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          communication_type: string
          content?: string | null
          created_at?: string
          delivery_status?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          organization_id?: string | null
          recipient_email: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          communication_type?: string
          content?: string | null
          created_at?: string
          delivery_status?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          organization_id?: string | null
          recipient_email?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_metrics: {
        Row: {
          calculation_date: string
          compliance_score: number | null
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          organization_id: string | null
          risk_level: string | null
          updated_at: string
        }
        Insert: {
          calculation_date?: string
          compliance_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          organization_id?: string | null
          risk_level?: string | null
          updated_at?: string
        }
        Update: {
          calculation_date?: string
          compliance_score?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          organization_id?: string | null
          risk_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_review_queue: {
        Row: {
          ai_suggested_change: string | null
          assigned_to: string | null
          completed_at: string | null
          content_id: string | null
          content_type: string
          created_at: string | null
          due_date: string | null
          id: string
          location: string
          regulatory_update_id: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          ai_suggested_change?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          content_id?: string | null
          content_type: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          location: string
          regulatory_update_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          ai_suggested_change?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          location?: string
          regulatory_update_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_review_queue_regulatory_update_id_fkey"
            columns: ["regulatory_update_id"]
            isOneToOne: false
            referencedRelation: "regulatory_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_type: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          organization_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          conversation_type?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          conversation_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          module_number: number
          quiz_questions: Json | null
          stoplight_tier: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_number: number
          quiz_questions?: Json | null
          stoplight_tier?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_number?: number
          quiz_questions?: Json | null
          stoplight_tier?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          module_count: number | null
          passing_score: number | null
          payment_required: boolean | null
          price_cents: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_count?: number | null
          passing_score?: number | null
          payment_required?: boolean | null
          price_cents?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          module_count?: number | null
          passing_score?: number | null
          payment_required?: boolean | null
          price_cents?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispensary_applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          application_status: string | null
          compliance_affirmation: boolean | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          created_at: string
          dba_name: string | null
          dispensary_number: string | null
          estimated_employees: number | null
          id: string
          legal_entity_name: string | null
          license_expiry_date: string | null
          license_issue_date: string | null
          license_number: string | null
          license_type: string | null
          organization_name: string
          preferred_start_date: string | null
          requested_credits: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          application_status?: string | null
          compliance_affirmation?: boolean | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          dba_name?: string | null
          dispensary_number?: string | null
          estimated_employees?: number | null
          id?: string
          legal_entity_name?: string | null
          license_expiry_date?: string | null
          license_issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          organization_name: string
          preferred_start_date?: string | null
          requested_credits?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          application_status?: string | null
          compliance_affirmation?: boolean | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          dba_name?: string | null
          dispensary_number?: string | null
          estimated_employees?: number | null
          id?: string
          legal_entity_name?: string | null
          license_expiry_date?: string | null
          license_issue_date?: string | null
          license_number?: string | null
          license_type?: string | null
          organization_name?: string
          preferred_start_date?: string | null
          requested_credits?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_type: string
          id: string
          metadata: Json | null
          provider_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_type: string
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          delivery_attempts: number | null
          delivery_method: string | null
          delivery_status: string | null
          email: string
          expires_at: string
          id: string
          phone_number: string | null
          purpose: string
          user_id: string | null
          verified_at: string | null
          vonage_request_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          delivery_attempts?: number | null
          delivery_method?: string | null
          delivery_status?: string | null
          email: string
          expires_at?: string
          id?: string
          phone_number?: string | null
          purpose: string
          user_id?: string | null
          verified_at?: string | null
          vonage_request_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          delivery_attempts?: number | null
          delivery_method?: string | null
          delivery_status?: string | null
          email?: string
          expires_at?: string
          id?: string
          phone_number?: string | null
          purpose?: string
          user_id?: string | null
          verified_at?: string | null
          vonage_request_id?: string | null
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          attempt_number: number | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          ip_address: string | null
          is_passed: boolean | null
          passing_score: number | null
          photo_verification_url: string | null
          started_at: string | null
          time_taken: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          passing_score?: number | null
          photo_verification_url?: string | null
          started_at?: string | null
          time_taken?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          passing_score?: number | null
          photo_verification_url?: string | null
          started_at?: string | null
          time_taken?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_assets: {
        Row: {
          alt_text: string
          asset_key: string
          created_at: string | null
          dimensions: Json | null
          file_size_kb: number | null
          id: string
          is_active: boolean | null
          public_url: string
          storage_path: string
          updated_at: string | null
          uploaded_by: string | null
          usage_locations: string[] | null
        }
        Insert: {
          alt_text: string
          asset_key: string
          created_at?: string | null
          dimensions?: Json | null
          file_size_kb?: number | null
          id?: string
          is_active?: boolean | null
          public_url: string
          storage_path: string
          updated_at?: string | null
          uploaded_by?: string | null
          usage_locations?: string[] | null
        }
        Update: {
          alt_text?: string
          asset_key?: string
          created_at?: string | null
          dimensions?: Json | null
          file_size_kb?: number | null
          id?: string
          is_active?: boolean | null
          public_url?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by?: string | null
          usage_locations?: string[] | null
        }
        Relationships: []
      }
      live_session_registrations: {
        Row: {
          attended: boolean | null
          id: string
          registered_at: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          id?: string
          registered_at?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean | null
          id?: string
          registered_at?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          host_bio: string | null
          host_name: string
          id: string
          is_active: boolean | null
          max_attendees: number | null
          session_date: string
          session_type: string | null
          title: string
          updated_at: string | null
          zoom_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_bio?: string | null
          host_name: string
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          session_date: string
          session_type?: string | null
          title: string
          updated_at?: string | null
          zoom_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_bio?: string | null
          host_name?: string
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          session_date?: string
          session_type?: string | null
          title?: string
          updated_at?: string | null
          zoom_link?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean | null
          message_type: string | null
          metadata: Json | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          delivery_method: string[] | null
          enabled: boolean | null
          frequency: string | null
          id: string
          metadata: Json | null
          notification_type: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_method?: string[] | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_method?: string[] | null
          enabled?: boolean | null
          frequency?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          organization_id: string | null
          priority: string | null
          recipient_email: string
          rule_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          recipient_email: string
          rule_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string | null
          recipient_email?: string
          rule_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          created_at: string
          enabled: boolean | null
          escalation_enabled: boolean | null
          escalation_levels: Json | null
          id: string
          message_template: string
          target_roles: string[] | null
          trigger_days: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          escalation_enabled?: boolean | null
          escalation_levels?: Json | null
          id?: string
          message_template: string
          target_roles?: string[] | null
          trigger_days?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          escalation_enabled?: boolean | null
          escalation_levels?: Json | null
          id?: string
          message_template?: string
          target_roles?: string[] | null
          trigger_days?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          paypal_order_id: string | null
          paypal_payer_id: string | null
          paypal_payment_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          paypal_payment_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          paypal_payment_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          admin_approved: boolean | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          course_credits: number | null
          created_at: string
          id: string
          is_active: boolean | null
          license_number: string | null
          name: string
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payer_id: string | null
          stripe_customer_id: string | null
          stripe_session_id: string | null
          unique_access_key: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_approved?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_credits?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          unique_access_key?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_approved?: boolean | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_credits?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          unique_access_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          order_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string | null
          id: string
          organization_id: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          currency?: string | null
          id?: string
          organization_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          organization_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          dispensary_access_key: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          id: string
          is_verified: boolean | null
          job_title: string | null
          last_name: string | null
          mca_registration_number: string | null
          organization: string | null
          organization_id: string | null
          phone: string | null
          phone_verified: boolean | null
          profile_photo_url: string | null
          state: string | null
          tier_status: string | null
          updated_at: string
          user_id: string
          verification_method_preference: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          dispensary_access_key?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_verified?: boolean | null
          job_title?: string | null
          last_name?: string | null
          mca_registration_number?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profile_photo_url?: string | null
          state?: string | null
          tier_status?: string | null
          updated_at?: string
          user_id: string
          verification_method_preference?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          dispensary_access_key?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_verified?: boolean | null
          job_title?: string | null
          last_name?: string | null
          mca_registration_number?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          profile_photo_url?: string | null
          state?: string | null
          tier_status?: string | null
          updated_at?: string
          user_id?: string
          verification_method_preference?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      regulatory_content: {
        Row: {
          content_html: string | null
          content_text: string
          created_at: string | null
          effective_date: string | null
          id: string
          last_checked_at: string | null
          last_modified_at: string | null
          section_number: string
          section_title: string
          source_url: string
          version_hash: string
        }
        Insert: {
          content_html?: string | null
          content_text: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_modified_at?: string | null
          section_number: string
          section_title: string
          source_url: string
          version_hash: string
        }
        Update: {
          content_html?: string | null
          content_text?: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_modified_at?: string | null
          section_number?: string
          section_title?: string
          source_url?: string
          version_hash?: string
        }
        Relationships: []
      }
      regulatory_updates: {
        Row: {
          admin_notes: string | null
          affected_modules: string[] | null
          ai_impact_analysis: string | null
          change_type: string
          created_at: string | null
          detected_at: string | null
          id: string
          new_content: string
          previous_content: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_number: string
        }
        Insert: {
          admin_notes?: string | null
          affected_modules?: string[] | null
          ai_impact_analysis?: string | null
          change_type: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_content: string
          previous_content?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_number: string
        }
        Update: {
          admin_notes?: string | null
          affected_modules?: string[] | null
          ai_impact_analysis?: string | null
          change_type?: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          new_content?: string
          previous_content?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_number?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      rvt_purchases: {
        Row: {
          amount_paid: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          metadata: Json | null
          organization_id: string
          payment_method: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payer_id: string | null
          quantity: number
          status: string
        }
        Insert: {
          amount_paid: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          metadata?: Json | null
          organization_id: string
          payment_method?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          quantity: number
          status?: string
        }
        Update: {
          amount_paid?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          organization_id?: string
          payment_method?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rvt_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rvt_seats: {
        Row: {
          assigned_at: string | null
          assigned_user_id: string | null
          course_id: string
          created_at: string
          id: string
          organization_id: string
          purchase_id: string
          status: string
          used_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          organization_id: string
          purchase_id: string
          status?: string
          used_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_user_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          purchase_id?: string
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rvt_seats_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rvt_seats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rvt_seats_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "rvt_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          organization_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source_ip: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          inviter_id: string | null
          metadata: Json | null
          organization_id: string | null
          role: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          inviter_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          role?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          inviter_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_achievements: {
        Row: {
          created_at: string | null
          id: string
          modules_completed: number
          tier: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          modules_completed: number
          tier: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          modules_completed?: number
          tier?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_metadata: {
        Row: {
          created_at: string | null
          department: string | null
          employee_id: string | null
          hire_date: string | null
          id: string
          manager_id: string | null
          notes: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          employee_id?: string | null
          hire_date?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          employee_id?: string | null
          hire_date?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          current_tier: string | null
          id: string
          is_completed: boolean | null
          module_id: string | null
          score: number | null
          tier_unlocked_at: string | null
          time_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          current_tier?: string | null
          id?: string
          is_completed?: boolean | null
          module_id?: string | null
          score?: number | null
          tier_unlocked_at?: string | null
          time_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          current_tier?: string | null
          id?: string
          is_completed?: boolean | null
          module_id?: string | null
          score?: number | null
          tier_unlocked_at?: string | null
          time_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_verification_preferences: {
        Row: {
          backup_method: string | null
          created_at: string
          id: string
          last_successful_method: string | null
          phone_number: string | null
          preferred_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_method?: string | null
          created_at?: string
          id?: string
          last_successful_method?: string | null
          phone_number?: string | null
          preferred_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_method?: string | null
          created_at?: string
          id?: string
          last_successful_method?: string | null
          phone_number?: string | null
          preferred_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_automations: {
        Row: {
          actions: Json
          created_at: string
          created_by: string | null
          enabled: boolean | null
          id: string
          name: string
          trigger_conditions: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          trigger_conditions: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_seat_to_user: {
        Args: { course_id: string; org_id: string; user_id: string }
        Returns: string
      }
      approve_dispensary_application: {
        Args: { application_id: string; credits?: number }
        Returns: {
          access_key: string
          message: string
          organization_id: string
          success: boolean
        }[]
      }
      calculate_compliance_score: {
        Args: { org_id: string }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          _action_type: string
          _max_requests?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      check_seat_availability: {
        Args: { course_id: string; org_id: string }
        Returns: boolean
      }
      cleanup_performance_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_initial_admin: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_test_organization: {
        Args: { contact_email: string; credits?: number; org_name: string }
        Returns: {
          access_key: string
          message: string
          organization_id: string
          success: boolean
        }[]
      }
      detect_outdated_content: {
        Args: Record<PropertyKey, never>
        Returns: {
          content_id: string
          content_type: string
          days_since_update: number
          last_updated_at: string
          location: string
          relevant_regulatory_updates: number
          status: string
          urgency_score: number
        }[]
      }
      generate_certificate_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_compliance_report: {
        Args: { org_id?: string }
        Returns: {
          active_certificates: number
          completion_rate: number
          compliance_score: number
          expired_certificates: number
          organization_name: string
          risk_level: string
          total_employees: number
          trained_employees: number
        }[]
      }
      generate_dispensary_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_dispensary_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_database_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          index_size: string
          row_count: number
          table_name: string
          table_size: string
          total_size: string
        }[]
      }
      get_organization_employees: {
        Args: { org_id: string }
        Returns: {
          certificates_count: number
          created_at: string
          current_tier: string
          email: string
          first_name: string
          last_activity: string
          last_name: string
          phone: string
          progress_percentage: number
          tier_unlocked_at: string
          user_id: string
        }[]
      }
      get_organization_seat_status: {
        Args: { org_id: string }
        Returns: {
          assigned: number
          available: number
          total_purchased: number
          used: number
          utilization_percentage: number
        }[]
      }
      get_user_organization_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_tier: {
        Args: { _user_id: string }
        Returns: string
      }
      get_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          first_name: string
          last_name: string
          roles: string[]
          user_id: string
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: { _details?: Json; _event_type: string }
        Returns: undefined
      }
      manage_user_role: {
        Args: {
          action: string
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      reject_dispensary_application: {
        Args: { application_id: string; rejection_reason: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      unlock_tier: {
        Args: { _modules_completed: number; _tier: string; _user_id: string }
        Returns: boolean
      }
      verify_certificate_status: {
        Args: { cert_number: string }
        Returns: {
          certificate_number: string
          course_title: string
          expiry_date: string
          issue_date: string
          status: string
        }[]
      }
    }
    Enums: {
      admin_permission:
        | "user_create"
        | "user_edit"
        | "user_delete"
        | "user_view_all"
        | "org_create"
        | "org_edit"
        | "org_delete"
        | "org_view_all"
        | "role_assign"
        | "role_revoke"
        | "certificate_issue"
        | "certificate_revoke"
        | "certificate_view_all"
        | "payment_view"
        | "payment_refund"
        | "content_edit"
        | "content_publish"
        | "analytics_view"
        | "security_audit"
        | "system_settings"
      app_role:
        | "student"
        | "dispensary_manager"
        | "admin"
        | "training_coordinator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_permission: [
        "user_create",
        "user_edit",
        "user_delete",
        "user_view_all",
        "org_create",
        "org_edit",
        "org_delete",
        "org_view_all",
        "role_assign",
        "role_revoke",
        "certificate_issue",
        "certificate_revoke",
        "certificate_view_all",
        "payment_view",
        "payment_refund",
        "content_edit",
        "content_publish",
        "analytics_view",
        "security_audit",
        "system_settings",
      ],
      app_role: [
        "student",
        "dispensary_manager",
        "admin",
        "training_coordinator",
      ],
    },
  },
} as const
