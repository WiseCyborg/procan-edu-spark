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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_agent_runs: {
        Row: {
          actions_taken: Json | null
          agent_name: string
          agent_type: string
          changes_detected: number | null
          created_at: string
          error_message: string | null
          execution_duration_ms: number | null
          execution_status: string
          id: string
          items_processed: number | null
          metadata: Json | null
        }
        Insert: {
          actions_taken?: Json | null
          agent_name: string
          agent_type: string
          changes_detected?: number | null
          created_at?: string
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_status: string
          id?: string
          items_processed?: number | null
          metadata?: Json | null
        }
        Update: {
          actions_taken?: Json | null
          agent_name?: string
          agent_type?: string
          changes_detected?: number | null
          created_at?: string
          error_message?: string | null
          execution_duration_ms?: number | null
          execution_status?: string
          id?: string
          items_processed?: number | null
          metadata?: Json | null
        }
        Relationships: []
      }
      ai_fix_plans: {
        Row: {
          affected_systems: Json | null
          analysis_model: string
          approved_at: string | null
          approved_by: string | null
          check_id: string | null
          created_at: string
          estimated_duration_seconds: number | null
          fix_steps: Json
          generated_at: string
          id: string
          risk_level: string | null
          rollback_strategy: string | null
          root_cause: string | null
        }
        Insert: {
          affected_systems?: Json | null
          analysis_model: string
          approved_at?: string | null
          approved_by?: string | null
          check_id?: string | null
          created_at?: string
          estimated_duration_seconds?: number | null
          fix_steps?: Json
          generated_at?: string
          id?: string
          risk_level?: string | null
          rollback_strategy?: string | null
          root_cause?: string | null
        }
        Update: {
          affected_systems?: Json | null
          analysis_model?: string
          approved_at?: string | null
          approved_by?: string | null
          check_id?: string | null
          created_at?: string
          estimated_duration_seconds?: number | null
          fix_steps?: Json
          generated_at?: string
          id?: string
          risk_level?: string | null
          rollback_strategy?: string | null
          root_cause?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_fix_plans_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "system_integrity_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          action_taken: boolean | null
          action_taken_at: string | null
          actionable: boolean | null
          category: string
          confidence_score: number | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          insight_type: string
          metadata: Json | null
          title: string
        }
        Insert: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          actionable?: boolean | null
          category: string
          confidence_score?: number | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          insight_type: string
          metadata?: Json | null
          title: string
        }
        Update: {
          action_taken?: boolean | null
          action_taken_at?: string | null
          actionable?: boolean | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: []
      }
      ailean_activation_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          organization_id: string
          token: string
          uses_remaining: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          organization_id: string
          token?: string
          uses_remaining?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          organization_id?: string
          token?: string
          uses_remaining?: number
        }
        Relationships: [
          {
            foreignKeyName: "ailean_activation_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ailean_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          scenario_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          scenario_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          scenario_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_console_audit: {
        Row: {
          api_route: string
          command: string
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          request_params: Json | null
          response_data: Json | null
          success: boolean
          user_id: string | null
          user_role: string
        }
        Insert: {
          api_route: string
          command: string
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          request_params?: Json | null
          response_data?: Json | null
          success: boolean
          user_id?: string | null
          user_role: string
        }
        Update: {
          api_route?: string
          command?: string
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          request_params?: Json | null
          response_data?: Json | null
          success?: boolean
          user_id?: string | null
          user_role?: string
        }
        Relationships: []
      }
      api_requests: {
        Row: {
          api_route: string
          created_at: string
          id: string
          idempotency_key: string
          request_params: Json | null
          response_data: Json | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          api_route: string
          created_at?: string
          id?: string
          idempotency_key: string
          request_params?: Json | null
          response_data?: Json | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          api_route?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          request_params?: Json | null
          response_data?: Json | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      automated_test_results: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          test_date: string
          test_name: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status: string
          test_date?: string
          test_name: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          test_date?: string
          test_name?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          certification_level: string | null
          course_id: string
          created_at: string
          exam_attempt_id: string
          expiry_date: string | null
          id: string
          is_revoked: boolean | null
          issue_date: string
          metadata: Json | null
          pdf_url: string | null
          tier_badge: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          certification_level?: string | null
          course_id: string
          created_at?: string
          exam_attempt_id: string
          expiry_date?: string | null
          id?: string
          is_revoked?: boolean | null
          issue_date?: string
          metadata?: Json | null
          pdf_url?: string | null
          tier_badge?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          certification_level?: string | null
          course_id?: string
          created_at?: string
          exam_attempt_id?: string
          expiry_date?: string | null
          id?: string
          is_revoked?: boolean | null
          issue_date?: string
          metadata?: Json | null
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
      chat_intent_log: {
        Row: {
          chat_session_id: string | null
          chosen_mode: string
          confidence_score: number | null
          created_at: string | null
          detected_intent: string
          id: string
          metadata: Json | null
          user_message: string
        }
        Insert: {
          chat_session_id?: string | null
          chosen_mode: string
          confidence_score?: number | null
          created_at?: string | null
          detected_intent: string
          id?: string
          metadata?: Json | null
          user_message: string
        }
        Update: {
          chat_session_id?: string | null
          chosen_mode?: string
          confidence_score?: number | null
          created_at?: string | null
          detected_intent?: string
          id?: string
          metadata?: Json | null
          user_message?: string
        }
        Relationships: []
      }
      comar_versions: {
        Row: {
          change_summary: string | null
          content: string | null
          created_at: string
          effective_date: string
          id: string
          section_reference: string
          supersedes: string | null
          updated_at: string
          version_number: string
        }
        Insert: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          effective_date: string
          id?: string
          section_reference: string
          supersedes?: string | null
          updated_at?: string
          version_number: string
        }
        Update: {
          change_summary?: string | null
          content?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          section_reference?: string
          supersedes?: string | null
          updated_at?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "comar_versions_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "comar_versions"
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
      competitive_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_taken: string | null
          alert_type: string
          competitor_id: string | null
          created_at: string
          description: string
          detected_at: string
          id: string
          metadata: Json | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          alert_type: string
          competitor_id?: string | null
          created_at?: string
          description: string
          detected_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_taken?: string | null
          alert_type?: string
          competitor_id?: string | null
          created_at?: string
          description?: string
          detected_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitive_alerts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitor_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analysis_history: {
        Row: {
          ai_agent_run_id: string | null
          analysis_date: string
          competitors_analyzed: number
          created_at: string
          id: string
          key_findings: string[] | null
          market_summary: string | null
          metadata: Json | null
          recommendations_generated: number
        }
        Insert: {
          ai_agent_run_id?: string | null
          analysis_date?: string
          competitors_analyzed?: number
          created_at?: string
          id?: string
          key_findings?: string[] | null
          market_summary?: string | null
          metadata?: Json | null
          recommendations_generated?: number
        }
        Update: {
          ai_agent_run_id?: string | null
          analysis_date?: string
          competitors_analyzed?: number
          created_at?: string
          id?: string
          key_findings?: string[] | null
          market_summary?: string | null
          metadata?: Json | null
          recommendations_generated?: number
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analysis_history_ai_agent_run_id_fkey"
            columns: ["ai_agent_run_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_snapshots: {
        Row: {
          competitor_name: string
          created_at: string
          features_detected: string[] | null
          id: string
          market_position: string | null
          metadata: Json | null
          notes: string | null
          price_per_student: number | null
          pricing_model: string | null
          snapshot_date: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          competitor_name: string
          created_at?: string
          features_detected?: string[] | null
          id?: string
          market_position?: string | null
          metadata?: Json | null
          notes?: string | null
          price_per_student?: number | null
          pricing_model?: string | null
          snapshot_date?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          competitor_name?: string
          created_at?: string
          features_detected?: string[] | null
          id?: string
          market_position?: string | null
          metadata?: Json | null
          notes?: string | null
          price_per_student?: number | null
          pricing_model?: string | null
          snapshot_date?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          affected_users_count: number | null
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          affected_users_count?: number | null
          alert_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          affected_users_count?: number | null
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
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
      consumer_certificates: {
        Row: {
          badge_name: string
          certificate_number: string
          course_title: string
          created_at: string | null
          enrollment_id: string
          id: string
          issue_date: string
          metadata: Json | null
          recipient_email: string | null
          recipient_name: string | null
          verification_url: string | null
        }
        Insert: {
          badge_name: string
          certificate_number: string
          course_title: string
          created_at?: string | null
          enrollment_id: string
          id?: string
          issue_date?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          verification_url?: string | null
        }
        Update: {
          badge_name?: string
          certificate_number?: string
          course_title?: string
          created_at?: string | null
          enrollment_id?: string
          id?: string
          issue_date?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          verification_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "consumer_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          email: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          started_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
          comar_compliance_status: string | null
          comar_reference: string | null
          comar_version_id: string | null
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          is_manager_only: boolean | null
          last_comar_review_date: string | null
          learning_objectives: Json | null
          lessons: Json | null
          module_number: number
          quiz_questions: Json | null
          stoplight_tier: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          comar_compliance_status?: string | null
          comar_reference?: string | null
          comar_version_id?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_manager_only?: boolean | null
          last_comar_review_date?: string | null
          learning_objectives?: Json | null
          lessons?: Json | null
          module_number: number
          quiz_questions?: Json | null
          stoplight_tier?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          comar_compliance_status?: string | null
          comar_reference?: string | null
          comar_version_id?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_manager_only?: boolean | null
          last_comar_review_date?: string | null
          learning_objectives?: Json | null
          lessons?: Json | null
          module_number?: number
          quiz_questions?: Json | null
          stoplight_tier?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_comar_version_id_fkey"
            columns: ["comar_version_id"]
            isOneToOne: false
            referencedRelation: "comar_versions"
            referencedColumns: ["id"]
          },
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
          completion_badge_name: string | null
          course_type: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          module_count: number | null
          passing_score: number | null
          payment_required: boolean | null
          price_cents: number | null
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completion_badge_name?: string | null
          course_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          module_count?: number | null
          passing_score?: number | null
          payment_required?: boolean | null
          price_cents?: number | null
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completion_badge_name?: string | null
          course_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          module_count?: number | null
          passing_score?: number | null
          payment_required?: boolean | null
          price_cents?: number | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_job_executions: {
        Row: {
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          id: string
          job_name: string
          status: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name: string
          status?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name?: string
          status?: string | null
        }
        Relationships: []
      }
      curriculum_recommendations: {
        Row: {
          category: string
          created_at: string
          created_by_agent: string | null
          data_source: Json | null
          description: string
          estimated_effort: string | null
          id: string
          impact: string | null
          impact_summary: Json | null
          implementation_date: string | null
          priority: string
          rationale: string | null
          related_module_ids: string[] | null
          related_sections: number[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          tracked_impact: boolean | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by_agent?: string | null
          data_source?: Json | null
          description: string
          estimated_effort?: string | null
          id?: string
          impact?: string | null
          impact_summary?: Json | null
          implementation_date?: string | null
          priority: string
          rationale?: string | null
          related_module_ids?: string[] | null
          related_sections?: number[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          tracked_impact?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by_agent?: string | null
          data_source?: Json | null
          description?: string
          estimated_effort?: string | null
          id?: string
          impact?: string | null
          impact_summary?: Json | null
          implementation_date?: string | null
          priority?: string
          rationale?: string | null
          related_module_ids?: string[] | null
          related_sections?: number[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          tracked_impact?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      dispensary_applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          application_status: string | null
          compliance_affirmation: boolean
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
          organization_id: string | null
          organization_name: string
          payment_amount: number | null
          payment_date: string | null
          payment_provider: string | null
          payment_status: string | null
          payment_transaction_id: string | null
          preferred_start_date: string | null
          registration_completed: boolean | null
          registration_token: string | null
          registration_token_expires_at: string | null
          requested_credits: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          application_status?: string | null
          compliance_affirmation?: boolean
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
          organization_id?: string | null
          organization_name: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          preferred_start_date?: string | null
          registration_completed?: boolean | null
          registration_token?: string | null
          registration_token_expires_at?: string | null
          requested_credits?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          application_status?: string | null
          compliance_affirmation?: boolean
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
          organization_id?: string | null
          organization_name?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          preferred_start_date?: string | null
          registration_completed?: boolean | null
          registration_token?: string | null
          registration_token_expires_at?: string | null
          requested_credits?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispensary_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_status: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          is_deployed: boolean
          last_check: string
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          is_deployed?: boolean
          last_check?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          is_deployed?: boolean
          last_check?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      email_analytics: {
        Row: {
          created_at: string
          email_log_id: string | null
          event_type: string
          id: string
          ip_address: unknown
          link_url: string | null
          metadata: Json | null
          occurred_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email_log_id?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email_log_id?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          link_url?: string | null
          metadata?: Json | null
          occurred_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_analytics_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics_summary: {
        Row: {
          bounce_rate: number | null
          click_rate: number | null
          created_at: string | null
          emails_delivered: number | null
          emails_failed: number | null
          emails_sent: number | null
          failure_rate: number | null
          id: string
          metadata: Json | null
          open_rate: number | null
          period_end: string
          period_start: string
          total_clicks: number | null
          total_opens: number | null
          unique_clicks: number | null
          unique_opens: number | null
          updated_at: string | null
        }
        Insert: {
          bounce_rate?: number | null
          click_rate?: number | null
          created_at?: string | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          failure_rate?: number | null
          id?: string
          metadata?: Json | null
          open_rate?: number | null
          period_end: string
          period_start: string
          total_clicks?: number | null
          total_opens?: number | null
          unique_clicks?: number | null
          unique_opens?: number | null
          updated_at?: string | null
        }
        Update: {
          bounce_rate?: number | null
          click_rate?: number | null
          created_at?: string | null
          emails_delivered?: number | null
          emails_failed?: number | null
          emails_sent?: number | null
          failure_rate?: number | null
          id?: string
          metadata?: Json | null
          open_rate?: number | null
          period_end?: string
          period_start?: string
          total_clicks?: number | null
          total_opens?: number | null
          unique_clicks?: number | null
          unique_opens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_circuit_breaker: {
        Row: {
          circuit_state: string
          closed_at: string | null
          failure_count: number
          half_open_at: string | null
          id: string
          last_failure_at: string | null
          metadata: Json | null
          opened_at: string | null
          updated_at: string
        }
        Insert: {
          circuit_state?: string
          closed_at?: string | null
          failure_count?: number
          half_open_at?: string | null
          id?: string
          last_failure_at?: string | null
          metadata?: Json | null
          opened_at?: string | null
          updated_at?: string
        }
        Update: {
          circuit_state?: string
          closed_at?: string | null
          failure_count?: number
          half_open_at?: string | null
          id?: string
          last_failure_at?: string | null
          metadata?: Json | null
          opened_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          click_count: number | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email_type: string
          error_message: string | null
          html_content: string | null
          id: string
          metadata: Json | null
          open_count: number | null
          opened_at: string | null
          provider: string | null
          provider_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string | null
          template_data: Json | null
          template_name: string | null
          user_id: string | null
        }
        Insert: {
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
          template_name?: string | null
          user_id?: string | null
        }
        Update: {
          click_count?: number | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
          template_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string | null
          frequency: string | null
          id: string
          receive_achievements: boolean | null
          receive_deadlines: boolean | null
          receive_marketing: boolean | null
          receive_reminders: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          receive_achievements?: boolean | null
          receive_deadlines?: boolean | null
          receive_marketing?: boolean | null
          receive_reminders?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          receive_achievements?: boolean | null
          receive_deadlines?: boolean | null
          receive_marketing?: boolean | null
          receive_reminders?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_provider_health: {
        Row: {
          created_at: string | null
          error_count: number | null
          id: string
          last_check_at: string | null
          last_success_at: string | null
          metadata: Json | null
          provider_name: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_check_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          provider_name: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_check_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          provider_name?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      email_template_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          html_content: string
          id: string
          subject_line: string
          template_id: string | null
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          html_content: string
          id?: string
          subject_line: string
          template_id?: string | null
          version: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          html_content?: string
          id?: string
          subject_line?: string
          template_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          subject_line: string
          template_name: string
          updated_at: string | null
          updated_by: string | null
          variables: Json
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          subject_line: string
          template_name: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          subject_line?: string
          template_name?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json
          version?: number | null
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
      enrollment_deadlines: {
        Row: {
          created_at: string | null
          deadline: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deadline: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deadline?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      escalation_log: {
        Row: {
          created_at: string | null
          escalation_level: number | null
          escalation_type: string
          id: string
          last_escalation_at: string | null
          notified_admin: boolean | null
          notified_manager: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          escalation_level?: number | null
          escalation_type: string
          id?: string
          last_escalation_at?: string | null
          notified_admin?: boolean | null
          notified_manager?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          escalation_level?: number | null
          escalation_type?: string
          id?: string
          last_escalation_at?: string | null
          notified_admin?: boolean | null
          notified_manager?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          attempt_number: number | null
          can_retake_at: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          days_since_last_attempt: number | null
          id: string
          ip_address: string | null
          is_passed: boolean | null
          metadata: Json | null
          passing_score: number | null
          photo_verification_url: string | null
          previous_attempt_count: number | null
          retake_cooldown_hours: number | null
          session_metadata: Json | null
          started_at: string | null
          time_taken: number | null
          topic_scores: Json | null
          total_score: number | null
          user_demographics: Json | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          can_retake_at?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          days_since_last_attempt?: number | null
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          metadata?: Json | null
          passing_score?: number | null
          photo_verification_url?: string | null
          previous_attempt_count?: number | null
          retake_cooldown_hours?: number | null
          session_metadata?: Json | null
          started_at?: string | null
          time_taken?: number | null
          topic_scores?: Json | null
          total_score?: number | null
          user_demographics?: Json | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          can_retake_at?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          days_since_last_attempt?: number | null
          id?: string
          ip_address?: string | null
          is_passed?: boolean | null
          metadata?: Json | null
          passing_score?: number | null
          photo_verification_url?: string | null
          previous_attempt_count?: number | null
          retake_cooldown_hours?: number | null
          session_metadata?: Json | null
          started_at?: string | null
          time_taken?: number | null
          topic_scores?: Json | null
          total_score?: number | null
          user_demographics?: Json | null
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
      exam_blueprint: {
        Row: {
          comar_section: string
          created_at: string
          id: string
          passing_threshold: number
          questions_count: number
          related_module_ids: string[] | null
          section_number: number
          section_title: string
          topic_area: string
          updated_at: string
        }
        Insert: {
          comar_section: string
          created_at?: string
          id?: string
          passing_threshold?: number
          questions_count?: number
          related_module_ids?: string[] | null
          section_number: number
          section_title: string
          topic_area: string
          updated_at?: string
        }
        Update: {
          comar_section?: string
          created_at?: string
          id?: string
          passing_threshold?: number
          questions_count?: number
          related_module_ids?: string[] | null
          section_number?: number
          section_title?: string
          topic_area?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_topic_scores: {
        Row: {
          comar_section: string
          created_at: string
          exam_attempt_id: string
          id: string
          needs_remediation: boolean
          questions_correct: number
          questions_total: number
          score_percentage: number
          section_number: number
          topic_area: string
        }
        Insert: {
          comar_section: string
          created_at?: string
          exam_attempt_id: string
          id?: string
          needs_remediation?: boolean
          questions_correct?: number
          questions_total?: number
          score_percentage: number
          section_number: number
          topic_area: string
        }
        Update: {
          comar_section?: string
          created_at?: string
          exam_attempt_id?: string
          id?: string
          needs_remediation?: boolean
          questions_correct?: number
          questions_total?: number
          score_percentage?: number
          section_number?: number
          topic_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_topic_scores_exam_attempt_id_fkey"
            columns: ["exam_attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
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
      feature_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          flag_key: string
          flag_value: boolean
          id: string
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          flag_key: string
          flag_value?: boolean
          id?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          flag_key?: string
          flag_value?: boolean
          id?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      federal_regulation_tracking: {
        Row: {
          checked_at: string
          content_hash: string
          content_text: string
          created_at: string
          id: string
          source_name: string
          source_type: string
          source_url: string
        }
        Insert: {
          checked_at?: string
          content_hash: string
          content_text: string
          created_at?: string
          id?: string
          source_name: string
          source_type: string
          source_url: string
        }
        Update: {
          checked_at?: string
          content_hash?: string
          content_text?: string
          created_at?: string
          id?: string
          source_name?: string
          source_type?: string
          source_url?: string
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
      integration_health: {
        Row: {
          created_at: string
          details: Json | null
          error_count: number | null
          id: string
          integration_name: string
          last_check: string
          response_time_ms: number | null
          status: string
          success_rate: number | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_count?: number | null
          id?: string
          integration_name: string
          last_check?: string
          response_time_ms?: number | null
          status: string
          success_rate?: number | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_count?: number | null
          id?: string
          integration_name?: string
          last_check?: string
          response_time_ms?: number | null
          status?: string
          success_rate?: number | null
        }
        Relationships: []
      }
      lighthouse_scores: {
        Row: {
          accessibility_score: number | null
          best_practices_score: number | null
          created_at: string
          environment: string
          id: string
          page_url: string
          performance_score: number | null
          seo_score: number | null
          test_date: string
        }
        Insert: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          created_at?: string
          environment?: string
          id?: string
          page_url: string
          performance_score?: number | null
          seo_score?: number | null
          test_date?: string
        }
        Update: {
          accessibility_score?: number | null
          best_practices_score?: number | null
          created_at?: string
          environment?: string
          id?: string
          page_url?: string
          performance_score?: number | null
          seo_score?: number | null
          test_date?: string
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
      maryland_county_analytics: {
        Row: {
          active_dispensaries: number | null
          average_score: number | null
          compliance_score: number | null
          county_name: string
          created_at: string
          id: string
          month: string
          pass_rate: number | null
          total_students: number | null
        }
        Insert: {
          active_dispensaries?: number | null
          average_score?: number | null
          compliance_score?: number | null
          county_name: string
          created_at?: string
          id?: string
          month: string
          pass_rate?: number | null
          total_students?: number | null
        }
        Update: {
          active_dispensaries?: number | null
          average_score?: number | null
          compliance_score?: number | null
          county_name?: string
          created_at?: string
          id?: string
          month?: string
          pass_rate?: number | null
          total_students?: number | null
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
      module_compliance_reviews: {
        Row: {
          comar_version_id: string | null
          compliance_status: string
          created_at: string
          id: string
          module_id: string
          next_review_due: string
          review_notes: string | null
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          comar_version_id?: string | null
          compliance_status?: string
          created_at?: string
          id?: string
          module_id: string
          next_review_due?: string
          review_notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          comar_version_id?: string | null
          compliance_status?: string
          created_at?: string
          id?: string
          module_id?: string
          next_review_due?: string
          review_notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_compliance_reviews_comar_version_id_fkey"
            columns: ["comar_version_id"]
            isOneToOne: false
            referencedRelation: "comar_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_compliance_reviews_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
      owner_digest_preferences: {
        Row: {
          created_at: string
          delivery_days: string[] | null
          delivery_time: string
          email_address: string
          enabled: boolean | null
          id: string
          include_sections: string[] | null
          sms_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_days?: string[] | null
          delivery_time?: string
          email_address: string
          enabled?: boolean | null
          id?: string
          include_sections?: string[] | null
          sms_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_days?: string[] | null
          delivery_time?: string
          email_address?: string
          enabled?: boolean | null
          id?: string
          include_sections?: string[] | null
          sms_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
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
      paypal_configuration: {
        Row: {
          created_at: string
          environment: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      pipeline_health_log: {
        Row: {
          check_type: string
          checked_at: string | null
          created_at: string | null
          error_count: number | null
          id: string
          last_error_message: string | null
          metadata: Json | null
          status: string
          success_count: number | null
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_error_message?: string | null
          metadata?: Json | null
          status: string
          success_count?: number | null
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_error_message?: string | null
          metadata?: Json | null
          status?: string
          success_count?: number | null
        }
        Relationships: []
      }
      platform_health_scores: {
        Row: {
          calculation_metadata: Json | null
          compliance_score: number | null
          created_at: string
          email_health_score: number | null
          engagement_score: number | null
          id: string
          overall_score: number
          revenue_health_score: number | null
          score_date: string
          security_score: number | null
        }
        Insert: {
          calculation_metadata?: Json | null
          compliance_score?: number | null
          created_at?: string
          email_health_score?: number | null
          engagement_score?: number | null
          id?: string
          overall_score: number
          revenue_health_score?: number | null
          score_date: string
          security_score?: number | null
        }
        Update: {
          calculation_metadata?: Json | null
          compliance_score?: number | null
          created_at?: string
          email_health_score?: number | null
          engagement_score?: number | null
          id?: string
          overall_score?: number
          revenue_health_score?: number | null
          score_date?: string
          security_score?: number | null
        }
        Relationships: []
      }
      prediction_models: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          model_name: string
          model_type: string
          performance_metrics: Json | null
          training_data_end: string | null
          training_data_start: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          model_name: string
          model_type: string
          performance_metrics?: Json | null
          training_data_end?: string | null
          training_data_start?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          model_name?: string
          model_type?: string
          performance_metrics?: Json | null
          training_data_end?: string | null
          training_data_start?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      prediction_results: {
        Row: {
          actual_value: number | null
          confidence_score: number | null
          created_at: string
          entity_id: string
          entity_type: string
          feature_values: Json | null
          id: string
          model_id: string | null
          predicted_value: number | null
          prediction_date: string
          variance_percentage: number | null
        }
        Insert: {
          actual_value?: number | null
          confidence_score?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          feature_values?: Json | null
          id?: string
          model_id?: string | null
          predicted_value?: number | null
          prediction_date?: string
          variance_percentage?: number | null
        }
        Update: {
          actual_value?: number | null
          confidence_score?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          feature_values?: Json | null
          id?: string
          model_id?: string | null
          predicted_value?: number | null
          prediction_date?: string
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prediction_results_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "prediction_models"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          dispensary_access_key: string | null
          email_cache: string | null
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
          email_cache?: string | null
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
          email_cache?: string | null
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
          window_minutes: number
          window_start: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          request_count?: number
          user_id: string
          window_minutes?: number
          window_start?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          request_count?: number
          user_id?: string
          window_minutes?: number
          window_start?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          actual_implementation_date: string | null
          actual_roi: number | null
          created_at: string
          id: string
          lessons_learned: string | null
          predicted_roi: number | null
          recommendation_id: string | null
          updated_at: string
          variance_percentage: number | null
          would_recommend_again: boolean | null
        }
        Insert: {
          actual_implementation_date?: string | null
          actual_roi?: number | null
          created_at?: string
          id?: string
          lessons_learned?: string | null
          predicted_roi?: number | null
          recommendation_id?: string | null
          updated_at?: string
          variance_percentage?: number | null
          would_recommend_again?: boolean | null
        }
        Update: {
          actual_implementation_date?: string | null
          actual_roi?: number | null
          created_at?: string
          id?: string
          lessons_learned?: string | null
          predicted_roi?: number | null
          recommendation_id?: string | null
          updated_at?: string
          variance_percentage?: number | null
          would_recommend_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "curriculum_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_impact_tracking: {
        Row: {
          annual_savings_usd: number | null
          baseline_avg_attempts: number | null
          baseline_avg_score: number | null
          baseline_pass_rate: number | null
          baseline_period_end: string
          baseline_period_start: string
          baseline_remediation_rate: number | null
          baseline_sample_size: number | null
          created_at: string
          estimated_cost_per_retake: number | null
          estimated_hours_saved_annually: number | null
          hours_spent_implementing: number | null
          id: string
          implementation_date: string
          improvement_avg_score: number | null
          improvement_pass_rate: number | null
          is_active: boolean | null
          measurement_period_end: string | null
          measurement_period_start: string
          notes: string | null
          post_avg_attempts: number | null
          post_avg_score: number | null
          post_pass_rate: number | null
          post_remediation_rate: number | null
          post_sample_size: number | null
          recommendation_id: string | null
          reduction_retake_rate: number | null
          retakes_prevented_annually: number | null
          roi_percentage: number | null
          updated_at: string
        }
        Insert: {
          annual_savings_usd?: number | null
          baseline_avg_attempts?: number | null
          baseline_avg_score?: number | null
          baseline_pass_rate?: number | null
          baseline_period_end: string
          baseline_period_start: string
          baseline_remediation_rate?: number | null
          baseline_sample_size?: number | null
          created_at?: string
          estimated_cost_per_retake?: number | null
          estimated_hours_saved_annually?: number | null
          hours_spent_implementing?: number | null
          id?: string
          implementation_date: string
          improvement_avg_score?: number | null
          improvement_pass_rate?: number | null
          is_active?: boolean | null
          measurement_period_end?: string | null
          measurement_period_start: string
          notes?: string | null
          post_avg_attempts?: number | null
          post_avg_score?: number | null
          post_pass_rate?: number | null
          post_remediation_rate?: number | null
          post_sample_size?: number | null
          recommendation_id?: string | null
          reduction_retake_rate?: number | null
          retakes_prevented_annually?: number | null
          roi_percentage?: number | null
          updated_at?: string
        }
        Update: {
          annual_savings_usd?: number | null
          baseline_avg_attempts?: number | null
          baseline_avg_score?: number | null
          baseline_pass_rate?: number | null
          baseline_period_end?: string
          baseline_period_start?: string
          baseline_remediation_rate?: number | null
          baseline_sample_size?: number | null
          created_at?: string
          estimated_cost_per_retake?: number | null
          estimated_hours_saved_annually?: number | null
          hours_spent_implementing?: number | null
          id?: string
          implementation_date?: string
          improvement_avg_score?: number | null
          improvement_pass_rate?: number | null
          is_active?: boolean | null
          measurement_period_end?: string | null
          measurement_period_start?: string
          notes?: string | null
          post_avg_attempts?: number | null
          post_avg_score?: number | null
          post_pass_rate?: number | null
          post_remediation_rate?: number | null
          post_sample_size?: number | null
          recommendation_id?: string | null
          reduction_retake_rate?: number | null
          retakes_prevented_annually?: number | null
          roi_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_impact_tracking_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "curriculum_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_change_notifications: {
        Row: {
          acknowledged_at: string | null
          change_summary: string
          change_type: string
          comar_section: string
          created_at: string | null
          id: string
          notification_sent_at: string | null
          requires_recertification: boolean | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          change_summary: string
          change_type: string
          comar_section: string
          created_at?: string | null
          id?: string
          notification_sent_at?: string | null
          requires_recertification?: boolean | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          change_summary?: string
          change_type?: string
          comar_section?: string
          created_at?: string | null
          id?: string
          notification_sent_at?: string | null
          requires_recertification?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      regulatory_content: {
        Row: {
          change_impact_level: string | null
          compliance_tips: Json | null
          content_html: string | null
          content_text: string
          created_at: string | null
          effective_date: string | null
          id: string
          last_checked_at: string | null
          last_mca_review_date: string | null
          last_modified_at: string | null
          plain_language_summary: string | null
          related_case_studies: string[] | null
          section_number: string
          section_title: string
          source_url: string
          version_hash: string
        }
        Insert: {
          change_impact_level?: string | null
          compliance_tips?: Json | null
          content_html?: string | null
          content_text: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_mca_review_date?: string | null
          last_modified_at?: string | null
          plain_language_summary?: string | null
          related_case_studies?: string[] | null
          section_number: string
          section_title: string
          source_url: string
          version_hash: string
        }
        Update: {
          change_impact_level?: string | null
          compliance_tips?: Json | null
          content_html?: string | null
          content_text?: string
          created_at?: string | null
          effective_date?: string | null
          id?: string
          last_checked_at?: string | null
          last_mca_review_date?: string | null
          last_modified_at?: string | null
          plain_language_summary?: string | null
          related_case_studies?: string[] | null
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
      roi_forecasts: {
        Row: {
          comparable_implementations: Json | null
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          created_at: string
          expected_pass_rate_improvement: number | null
          forecast_date: string
          id: string
          model_version: string | null
          payback_period_months: number | null
          predicted_roi_percentage: number | null
          recommendation_id: string | null
          risk_factors: Json | null
        }
        Insert: {
          comparable_implementations?: Json | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string
          expected_pass_rate_improvement?: number | null
          forecast_date?: string
          id?: string
          model_version?: string | null
          payback_period_months?: number | null
          predicted_roi_percentage?: number | null
          recommendation_id?: string | null
          risk_factors?: Json | null
        }
        Update: {
          comparable_implementations?: Json | null
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string
          expected_pass_rate_improvement?: number | null
          forecast_date?: string
          id?: string
          model_version?: string | null
          payback_period_months?: number | null
          predicted_roi_percentage?: number | null
          recommendation_id?: string | null
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_forecasts_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "curriculum_recommendations"
            referencedColumns: ["id"]
          },
        ]
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
      rvt_join_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          organization_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rvt_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      site_content_metadata: {
        Row: {
          content_key: string
          created_at: string
          id: string
          last_updated_at: string
          notes: string | null
          updated_by: string | null
        }
        Insert: {
          content_key: string
          created_at?: string
          id?: string
          last_updated_at?: string
          notes?: string | null
          updated_by?: string | null
        }
        Update: {
          content_key?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          notes?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      slo_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
          status: string
          target_value: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
          status: string
          target_value: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          status?: string
          target_value?: number
          unit?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          error_message: string | null
          expires_at: string
          id: string
          invitation_token: string
          inviter_id: string | null
          metadata: Json | null
          organization_id: string | null
          resend_count: number | null
          role: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          expires_at?: string
          id?: string
          invitation_token: string
          inviter_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resend_count?: number | null
          role?: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          inviter_id?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resend_count?: number | null
          role?: string
          sent_at?: string | null
          status?: string | null
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
      student_certification_versions: {
        Row: {
          certified_at: string
          comar_version_hash: string
          created_at: string | null
          id: string
          module_id: string
          requires_update: boolean | null
          update_reason: string | null
          user_id: string
        }
        Insert: {
          certified_at: string
          comar_version_hash: string
          created_at?: string | null
          id?: string
          module_id: string
          requires_update?: boolean | null
          update_reason?: string | null
          user_id: string
        }
        Update: {
          certified_at?: string
          comar_version_hash?: string
          created_at?: string | null
          id?: string
          module_id?: string
          requires_update?: boolean | null
          update_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_certification_versions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      support_queue: {
        Row: {
          assigned_to: string | null
          chat_context: Json | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          request_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string
        }
        Insert: {
          assigned_to?: string | null
          chat_context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_role: string
        }
        Update: {
          assigned_to?: string | null
          chat_context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_role?: string
        }
        Relationships: []
      }
      system_health_snapshots: {
        Row: {
          component_scores: Json
          created_at: string
          gaps: Json | null
          id: string
          overall_health_score: number | null
          snapshot_date: string
          test_results: Json | null
        }
        Insert: {
          component_scores?: Json
          created_at?: string
          gaps?: Json | null
          id?: string
          overall_health_score?: number | null
          snapshot_date?: string
          test_results?: Json | null
        }
        Update: {
          component_scores?: Json
          created_at?: string
          gaps?: Json | null
          id?: string
          overall_health_score?: number | null
          snapshot_date?: string
          test_results?: Json | null
        }
        Relationships: []
      }
      system_integrity_checks: {
        Row: {
          affected_entity_id: string | null
          affected_entity_type: string
          auto_fixable: boolean | null
          check_type: string
          created_at: string | null
          detected_at: string | null
          id: string
          issue_description: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          suggested_fix: string | null
          technical_details: Json | null
          updated_at: string | null
        }
        Insert: {
          affected_entity_id?: string | null
          affected_entity_type: string
          auto_fixable?: boolean | null
          check_type: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          issue_description: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status: string
          suggested_fix?: string | null
          technical_details?: Json | null
          updated_at?: string | null
        }
        Update: {
          affected_entity_id?: string | null
          affected_entity_type?: string
          auto_fixable?: boolean | null
          check_type?: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          issue_description?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          suggested_fix?: string | null
          technical_details?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_integrity_fixes: {
        Row: {
          ai_plan_id: string | null
          changes_made: Json | null
          check_id: string | null
          created_at: string | null
          error_details: Json | null
          executed_at: string | null
          executed_by: string | null
          execution_duration_ms: number | null
          execution_mode: string
          execution_steps: Json | null
          fix_action: string
          fix_type: string
          id: string
          rollback_available: boolean | null
          rollback_data: Json | null
          success: boolean
          user_approved_at: string | null
          verification_result: Json | null
        }
        Insert: {
          ai_plan_id?: string | null
          changes_made?: Json | null
          check_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_duration_ms?: number | null
          execution_mode: string
          execution_steps?: Json | null
          fix_action: string
          fix_type: string
          id?: string
          rollback_available?: boolean | null
          rollback_data?: Json | null
          success: boolean
          user_approved_at?: string | null
          verification_result?: Json | null
        }
        Update: {
          ai_plan_id?: string | null
          changes_made?: Json | null
          check_id?: string | null
          created_at?: string | null
          error_details?: Json | null
          executed_at?: string | null
          executed_by?: string | null
          execution_duration_ms?: number | null
          execution_mode?: string
          execution_steps?: Json | null
          fix_action?: string
          fix_type?: string
          id?: string
          rollback_available?: boolean | null
          rollback_data?: Json | null
          success?: boolean
          user_approved_at?: string | null
          verification_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_integrity_fixes_ai_plan_id_fkey"
            columns: ["ai_plan_id"]
            isOneToOne: false
            referencedRelation: "ai_fix_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_integrity_fixes_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "system_integrity_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      system_jobs: {
        Row: {
          completed_at: string | null
          created_by: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          last_error: string | null
          max_retries: number
          metadata: Json | null
          next_retry_at: string | null
          organization_id: string | null
          payload: Json
          queued_at: string
          retry_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          job_type: string
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at?: string | null
          organization_id?: string | null
          payload: Json
          queued_at?: string
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          job_type?: string
          last_error?: string | null
          max_retries?: number
          metadata?: Json | null
          next_retry_at?: string | null
          organization_id?: string | null
          payload?: Json
          queued_at?: string
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_jobs_deadletter: {
        Row: {
          failure_reason: string
          id: string
          job_type: string
          last_error: string | null
          metadata: Json | null
          moved_to_dlq_at: string
          original_queued_at: string
          payload: Json
          retry_count: number
        }
        Insert: {
          failure_reason: string
          id: string
          job_type: string
          last_error?: string | null
          metadata?: Json | null
          moved_to_dlq_at?: string
          original_queued_at: string
          payload: Json
          retry_count: number
        }
        Update: {
          failure_reason?: string
          id?: string
          job_type?: string
          last_error?: string | null
          metadata?: Json | null
          moved_to_dlq_at?: string
          original_queued_at?: string
          payload?: Json
          retry_count?: number
        }
        Relationships: []
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
      uat_accounts: {
        Row: {
          account_type: string
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          last_reset_at: string | null
          notes: string | null
          organization_id: string | null
          password_hint: string | null
          reset_count: number | null
          user_id: string
        }
        Insert: {
          account_type: string
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_reset_at?: string | null
          notes?: string | null
          organization_id?: string | null
          password_hint?: string | null
          reset_count?: number | null
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_reset_at?: string | null
          notes?: string | null
          organization_id?: string | null
          password_hint?: string | null
          reset_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uat_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          email: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_journey_state: {
        Row: {
          created_at: string | null
          current_stage: string
          current_step: number | null
          current_wizard: string | null
          id: string
          last_action: string | null
          last_activity_at: string | null
          last_page_visited: string | null
          last_resume_prompt_at: string | null
          resume_prompt_count: number | null
          stage_entered_at: string | null
          updated_at: string | null
          user_id: string
          welcome_message_shown: boolean | null
          wizard_metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          current_stage?: string
          current_step?: number | null
          current_wizard?: string | null
          id?: string
          last_action?: string | null
          last_activity_at?: string | null
          last_page_visited?: string | null
          last_resume_prompt_at?: string | null
          resume_prompt_count?: number | null
          stage_entered_at?: string | null
          updated_at?: string | null
          user_id: string
          welcome_message_shown?: boolean | null
          wizard_metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          current_stage?: string
          current_step?: number | null
          current_wizard?: string | null
          id?: string
          last_action?: string | null
          last_activity_at?: string | null
          last_page_visited?: string | null
          last_resume_prompt_at?: string | null
          resume_prompt_count?: number | null
          stage_entered_at?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_message_shown?: boolean | null
          wizard_metadata?: Json | null
        }
        Relationships: []
      }
      user_learning_journey: {
        Row: {
          ai_recommendations: string | null
          at_risk_flag: boolean | null
          completion_percentage: number | null
          created_at: string | null
          current_stage: string | null
          exam_attempts: number | null
          id: string
          intervention_types: Json | null
          interventions_sent: number | null
          last_activity_at: string | null
          last_exam_score: number | null
          last_intervention_at: string | null
          metadata: Json | null
          modules_completed: number | null
          organization_id: string | null
          predicted_completion_date: string | null
          risk_factors: Json | null
          stage_entered_at: string | null
          success_probability: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_recommendations?: string | null
          at_risk_flag?: boolean | null
          completion_percentage?: number | null
          created_at?: string | null
          current_stage?: string | null
          exam_attempts?: number | null
          id?: string
          intervention_types?: Json | null
          interventions_sent?: number | null
          last_activity_at?: string | null
          last_exam_score?: number | null
          last_intervention_at?: string | null
          metadata?: Json | null
          modules_completed?: number | null
          organization_id?: string | null
          predicted_completion_date?: string | null
          risk_factors?: Json | null
          stage_entered_at?: string | null
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_recommendations?: string | null
          at_risk_flag?: boolean | null
          completion_percentage?: number | null
          created_at?: string | null
          current_stage?: string | null
          exam_attempts?: number | null
          id?: string
          intervention_types?: Json | null
          interventions_sent?: number | null
          last_activity_at?: string | null
          last_exam_score?: number | null
          last_intervention_at?: string | null
          metadata?: Json | null
          modules_completed?: number | null
          organization_id?: string | null
          predicted_completion_date?: string | null
          risk_factors?: Json | null
          stage_entered_at?: string | null
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_journey_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      user_operation_logs: {
        Row: {
          client_info: Json | null
          created_at: string
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          operation_data: Json | null
          operation_type: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          client_info?: Json | null
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          operation_data?: Json | null
          operation_type: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          client_info?: Json | null
          created_at?: string
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          operation_data?: Json | null
          operation_type?: string
          success?: boolean
          user_id?: string | null
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
      video_assets: {
        Row: {
          asset_key: string
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size_mb: number | null
          id: string
          is_active: boolean | null
          module_id: string | null
          public_url: string
          storage_path: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          asset_key: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          public_url: string
          storage_path: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          asset_key?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          public_url?: string
          storage_path?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_participants: {
        Row: {
          call_id: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          call_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          call_id?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          call_type: string | null
          conversation_id: string | null
          created_at: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_recording: boolean | null
          max_participants: number | null
          metadata: Json | null
          organization_id: string | null
          room_name: string
          scheduled_at: string | null
          started_at: string | null
          title: string
        }
        Insert: {
          call_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_recording?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          organization_id?: string | null
          room_name: string
          scheduled_at?: string | null
          started_at?: string | null
          title: string
        }
        Update: {
          call_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_recording?: boolean | null
          max_participants?: number | null
          metadata?: Json | null
          organization_id?: string | null
          room_name?: string
          scheduled_at?: string | null
          started_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      exam_analytics_overview: {
        Row: {
          average_failing_score: number | null
          average_passing_score: number | null
          average_score: number | null
          failed_attempts: number | null
          first_attempt_date: string | null
          most_recent_attempt_date: string | null
          overall_pass_rate: number | null
          passed_attempts: number | null
          total_attempts: number | null
          unique_test_takers: number | null
        }
        Relationships: []
      }
      exam_difficulty_analysis: {
        Row: {
          average_performance: number | null
          comar_section: string | null
          difficulty_level: string | null
          failure_rate: number | null
          sample_size: number | null
          section_number: number | null
          section_title: string | null
        }
        Relationships: []
      }
      exam_monthly_trends: {
        Row: {
          avg_score: number | null
          failed: number | null
          month: string | null
          pass_rate: number | null
          passed: number | null
          total_attempts: number | null
        }
        Relationships: []
      }
      exam_struggling_sections: {
        Row: {
          average_score: number | null
          avg_struggling_score: number | null
          comar_section: string | null
          section_number: number | null
          section_title: string | null
          struggle_rate: number | null
          students_struggling: number | null
          topic_area: string | null
          total_attempts: number | null
        }
        Relationships: []
      }
      exam_topic_analytics: {
        Row: {
          average_score: number | null
          comar_section: string | null
          failed_count: number | null
          max_score: number | null
          median_score: number | null
          min_score: number | null
          pass_rate: number | null
          passed_count: number | null
          remediation_required_count: number | null
          score_std_dev: number | null
          section_number: number | null
          section_title: string | null
          topic_area: string | null
          total_attempts: number | null
        }
        Relationships: []
      }
      user_exam_stats: {
        Row: {
          average_score: number | null
          best_score: number | null
          can_retake_now: boolean | null
          course_id: string | null
          failed_attempts: number | null
          first_attempt_date: string | null
          last_attempt_date: string | null
          next_retake_available: string | null
          passed_attempts: number | null
          total_attempts: number | null
          user_id: string | null
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
      v_paypal_runtime: {
        Row: {
          env: string | null
          id: string | null
          mode: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_pipeline_metrics: {
        Row: {
          applications_approved_30d: number | null
          applications_pending: number | null
          applications_rejected_30d: number | null
          applications_submitted_30d: number | null
          approval_rate_30d: number | null
          assigned_seats: number | null
          available_seats: number | null
          avg_approval_hours_30d: number | null
          avg_completion_days_30d: number | null
          calculated_at: string | null
          certificates_expired: number | null
          certificates_expiring_soon: number | null
          certificates_issued_30d: number | null
          certification_conversion_rate_30d: number | null
          exam_pass_rate_30d: number | null
          exams_passed_30d: number | null
          exams_taken_30d: number | null
          orgs_with_unused_seats: number | null
          seat_utilization_rate: number | null
          total_seats: number | null
          used_seats: number | null
          users_registered_30d: number | null
        }
        Relationships: []
      }
      v_processor_pulse: {
        Row: {
          avg_processing_seconds: number | null
          completed: number | null
          failed: number | null
          job_type: string | null
          total_jobs: number | null
        }
        Relationships: []
      }
      v_queue_health: {
        Row: {
          completed_count: number | null
          failed_count: number | null
          last_job_queued_at: string | null
          oldest_queued_age_seconds: number | null
          processing_count: number | null
          queued_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      allocate_seat_to_user: {
        Args: { course_id: string; org_id: string; user_id: string }
        Returns: string
      }
      approve_dispensary_application: {
        Args: {
          application_id: string
          calling_user_id?: string
          credits?: number
        }
        Returns: {
          access_key: string
          join_code: string
          message: string
          organization_id: string
          purchase_id: string
          success: boolean
        }[]
      }
      bulk_verify_users: {
        Args: { admin_notes?: string; target_user_ids: string[] }
        Returns: Json
      }
      calculate_compliance_score: { Args: { org_id: string }; Returns: number }
      calculate_next_retake_time: {
        Args: {
          p_cooldown_hours?: number
          p_course_id: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_slo_metrics: { Args: never; Returns: undefined }
      check_email_circuit: {
        Args: never
        Returns: {
          failure_count: number
          is_open: boolean
          state: string
        }[]
      }
      check_email_preference: {
        Args: { p_email_type: string; p_user_id: string }
        Returns: boolean
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
      check_seat_mismatches: {
        Args: never
        Returns: {
          course_credits: number
          deficit: number
          organization_id: string
          organization_name: string
          seat_count: number
        }[]
      }
      check_stuck_applications: {
        Args: never
        Returns: {
          application_id: string
          contact_email: string
          hours_stuck: number
          last_updated: string
          organization_name: string
          status: string
        }[]
      }
      cleanup_old_api_requests: { Args: never; Returns: undefined }
      cleanup_performance_metrics: { Args: never; Returns: undefined }
      clear_user_rate_limits: {
        Args: { _action_type?: string; _user_id?: string }
        Returns: number
      }
      create_initial_admin: { Args: never; Returns: string }
      create_initial_seats_for_organization: {
        Args: { org_id: string; purchased_by_id?: string; quantity?: number }
        Returns: string
      }
      create_test_organization: {
        Args: { contact_email: string; credits?: number; org_name: string }
        Returns: {
          access_key: string
          join_code: string
          message: string
          organization_id: string
          registration_token: string
          registration_url: string
          success: boolean
        }[]
      }
      deallocate_seat: { Args: { seat_id_param: string }; Returns: boolean }
      detect_outdated_content: {
        Args: never
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
      expire_test_organizations: { Args: never; Returns: undefined }
      generate_certificate_number: { Args: never; Returns: string }
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
      generate_dispensary_key: { Args: never; Returns: string }
      generate_dispensary_number: { Args: never; Returns: string }
      generate_invitation_token: { Args: never; Returns: string }
      get_active_rate_limits: {
        Args: never
        Returns: {
          action_type: string
          created_at: string
          id: string
          request_count: number
          time_remaining_minutes: number
          user_email: string
          user_id: string
          window_minutes: number
          window_start: string
        }[]
      }
      get_admin_user_overview: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          first_name: string
          last_name: string
          last_sign_in_at: string
          organization_id: string
          organization_name: string
          phone: string
          raw_user_meta_data: Json
          user_id: string
        }[]
      }
      get_database_stats: {
        Args: never
        Returns: {
          index_size: string
          row_count: number
          table_name: string
          table_size: string
          total_size: string
        }[]
      }
      get_jobs_to_process: {
        Args: { batch_size?: number }
        Returns: {
          completed_at: string | null
          created_by: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          last_error: string | null
          max_retries: number
          metadata: Json | null
          next_retry_at: string | null
          organization_id: string | null
          payload: Json
          queued_at: string
          retry_count: number
          started_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "system_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_modules_needing_review: {
        Args: never
        Returns: {
          comar_reference: string
          days_overdue: number
          last_reviewed_at: string
          module_id: string
          module_number: number
          module_title: string
        }[]
      }
      get_organization_certificates: {
        Args: { org_id: string }
        Returns: {
          certificate_id: string
          certificate_number: string
          email: string
          expiry_date: string
          first_name: string
          is_revoked: boolean
          issued_at: string
          last_name: string
          user_id: string
          verification_count: number
        }[]
      }
      get_organization_employees: {
        Args: { org_id: string }
        Returns: {
          certificate_number: string
          certificate_status: string
          certificates_count: number
          created_at: string
          current_tier: string
          email: string
          first_name: string
          invitation_sent_at: string
          invitation_status: string
          last_activity: string
          last_login: string
          last_name: string
          profile_completion: number
          progress_percentage: number
          role: string
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
      get_profile_change_history: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          changed_at: string
          changed_by: string
          field_name: string
          new_value: string
          old_value: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_organization_id: { Args: { user_uuid: string }; Returns: string }
      get_user_tier: { Args: { _user_id: string }; Returns: string }
      get_users_with_roles: {
        Args: never
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
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_feature_enabled: {
        Args: {
          p_flag_key: string
          p_organization_id?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      is_own_profile: {
        Args: { _profile_user_id: string; _user_id: string }
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
      manually_verify_user: {
        Args: { admin_notes?: string; target_user_id: string }
        Returns: Json
      }
      mark_module_reviewed: {
        Args: {
          p_compliance_status?: string
          p_module_id: string
          p_review_notes?: string
        }
        Returns: string
      }
      move_to_deadletter: { Args: { p_job_id: string }; Returns: undefined }
      queue_job: {
        Args: {
          p_idempotency_key?: string
          p_job_type: string
          p_max_retries?: number
          p_organization_id?: string
          p_payload: Json
        }
        Returns: string
      }
      reconcile_seats: {
        Args: never
        Returns: {
          actual_seats: number
          organization_id: string
          organization_name: string
          purchased_quantity: number
          seats_generated: number
          seats_missing: number
          status: string
        }[]
      }
      record_email_result: { Args: { p_success: boolean }; Returns: undefined }
      regenerate_manager_token: {
        Args: { application_id: string }
        Returns: {
          expires_at: string
          message: string
          new_token: string
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
      run_pipeline_health_check: { Args: never; Returns: Json }
      schedule_if_missing: {
        Args: { p_jobname: string; p_spec: string; p_sql: string }
        Returns: undefined
      }
      send_bulk_reminders: {
        Args: {
          coordinator_id: string
          message_template: string
          user_ids: string[]
        }
        Returns: number
      }
      test_system_health: { Args: never; Returns: Json }
      trigger_optimizer_now: { Args: never; Returns: Json }
      unassign_seat: { Args: { seat_id_param: string }; Returns: boolean }
      unlock_tier: {
        Args: { _modules_completed: number; _tier: string; _user_id: string }
        Returns: boolean
      }
      update_enrollment_deadline: {
        Args: { deadline_date: string; user_id_param: string }
        Returns: boolean
      }
      user_can_view_profile: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      validate_join_code_has_seats: {
        Args: { _code: string }
        Returns: boolean
      }
      validate_registration_token: {
        Args: { token_value: string }
        Returns: {
          application_id: string
          error_message: string
          expires_at: string
          is_valid: boolean
          organization_id: string
          organization_name: string
        }[]
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
        | "consumer"
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
        "consumer",
      ],
    },
  },
} as const
