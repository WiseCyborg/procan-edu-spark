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
      admin_operations_audit: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          operation_type: string
          performed_by: string
          success: boolean | null
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          operation_type: string
          performed_by: string
          success?: boolean | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          operation_type?: string
          performed_by?: string
          success?: boolean | null
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_proxy_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          revoked_at: string | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          revoked_at?: string | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          revoked_at?: string | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
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
      agent_configs: {
        Row: {
          agent_type: string
          created_at: string | null
          failure_count: number | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          last_run_duration_ms: number | null
          last_run_status: string | null
          run_count: number | null
          schedule_cron: string | null
          success_count: number | null
          thresholds: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_status?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          thresholds?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_status?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          success_count?: number | null
          thresholds?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_escalations: {
        Row: {
          agent_type: string
          attempts: number | null
          created_at: string | null
          escalation_level: number | null
          first_detected_at: string | null
          id: string
          issue_description: string
          issue_type: string
          last_escalated_at: string | null
          metadata: Json | null
          organization_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          agent_type: string
          attempts?: number | null
          created_at?: string | null
          escalation_level?: number | null
          first_detected_at?: string | null
          id?: string
          issue_description: string
          issue_type: string
          last_escalated_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          agent_type?: string
          attempts?: number | null
          created_at?: string | null
          escalation_level?: number | null
          first_detected_at?: string | null
          id?: string
          issue_description?: string
          issue_type?: string
          last_escalated_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_escalations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "agent_escalations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_escalations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      agent_events: {
        Row: {
          completed_at: string | null
          correlation_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          max_retries: number | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
          source_agent: string
          status: string | null
          target_agent: string | null
        }
        Insert: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          max_retries?: number | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          source_agent: string
          status?: string | null
          target_agent?: string | null
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          max_retries?: number | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          source_agent?: string
          status?: string | null
          target_agent?: string | null
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "ailean_activation_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ailean_activation_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      alert_rules: {
        Row: {
          comparison_operator: string
          cooldown_minutes: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          metric_name: string
          notification_channel: string
          recipient_emails: string[] | null
          threshold_value: number
          updated_at: string | null
        }
        Insert: {
          comparison_operator: string
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_name: string
          notification_channel: string
          recipient_emails?: string[] | null
          threshold_value: number
          updated_at?: string | null
        }
        Update: {
          comparison_operator?: string
          cooldown_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          metric_name?: string
          notification_channel?: string
          recipient_emails?: string[] | null
          threshold_value?: number
          updated_at?: string | null
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
      avatar_prompts: {
        Row: {
          category: string
          created_at: string
          gaze_target: string | null
          id: string
          is_active: boolean
          name: string
          priority: string
          roles: string[]
          template: string
          trigger: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          gaze_target?: string | null
          id: string
          is_active?: boolean
          name: string
          priority?: string
          roles?: string[]
          template: string
          trigger: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          gaze_target?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: string
          roles?: string[]
          template?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificate_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          certificate_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          certificate_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          certificate_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_audit_log_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_generation_errors: {
        Row: {
          attempt_number: number
          certificate_id: string | null
          course_id: string | null
          created_at: string
          error_detail: Json | null
          error_message: string
          exam_attempt_id: string | null
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          attempt_number?: number
          certificate_id?: string | null
          course_id?: string | null
          created_at?: string
          error_detail?: Json | null
          error_message: string
          exam_attempt_id?: string | null
          id?: string
          source: string
          user_id?: string | null
        }
        Update: {
          attempt_number?: number
          certificate_id?: string | null
          course_id?: string | null
          created_at?: string
          error_detail?: Json | null
          error_message?: string
          exam_attempt_id?: string | null
          id?: string
          source?: string
          user_id?: string | null
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "communication_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      compliance_incidents: {
        Row: {
          created_at: string
          description: string
          employee_user_id: string | null
          id: string
          incident_type: string
          metadata: Json | null
          organization_id: string
          reported_at: string
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          employee_user_id?: string | null
          id?: string
          incident_type: string
          metadata?: Json | null
          organization_id: string
          reported_at?: string
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          employee_user_id?: string | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          organization_id?: string
          reported_at?: string
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      compliance_packets: {
        Row: {
          created_at: string
          created_by: string
          employee_user_id: string | null
          file_name: string | null
          id: string
          metadata: Json | null
          organization_id: string
          packet_type: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          employee_user_id?: string | null
          file_name?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          packet_type?: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          employee_user_id?: string | null
          file_name?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          packet_type?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "compliance_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_packets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
          active_call_id: string | null
          channel_category: string | null
          conversation_type: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          metadata: Json | null
          organization_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active_call_id?: string | null
          channel_category?: string | null
          conversation_type?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active_call_id?: string | null
          channel_category?: string | null
          conversation_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_active_call_id_fkey"
            columns: ["active_call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      course_completions: {
        Row: {
          completed_at: string
          completion_percent: number
          course_id: string
          created_at: string
          id: string
          metadata: Json | null
          passed: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_percent?: number
          course_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          passed?: boolean
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_percent?: number
          course_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          passed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_credentials: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          credential_name: string
          credential_type: string
          id: string
          is_compliance_certificate: boolean
          min_completion_percent: number
          quiz_min_score: number | null
          requires_quiz_pass: boolean
          template_version: string | null
          updated_at: string
          verification_prefix: string
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          credential_name: string
          credential_type?: string
          id?: string
          is_compliance_certificate?: boolean
          min_completion_percent?: number
          quiz_min_score?: number | null
          requires_quiz_pass?: boolean
          template_version?: string | null
          updated_at?: string
          verification_prefix: string
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          credential_name?: string
          credential_type?: string
          id?: string
          is_compliance_certificate?: boolean
          min_completion_percent?: number
          quiz_min_score?: number | null
          requires_quiz_pass?: boolean
          template_version?: string | null
          updated_at?: string
          verification_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_credentials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_entitlements: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          metadata: Json | null
          purchased_at: string
          source: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          purchased_at?: string
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          purchased_at?: string
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_entitlements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
          unmapped_reason: string | null
          updated_at: string
          version: number | null
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
          unmapped_reason?: string | null
          updated_at?: string
          version?: number | null
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
          unmapped_reason?: string | null
          updated_at?: string
          version?: number | null
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
      course_resume_state: {
        Row: {
          course_id: string
          created_at: string
          id: string
          last_activity_at: string
          last_page_index: number
          last_tab: string
          module_id: string | null
          module_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          last_activity_at?: string
          last_page_index?: number
          last_tab?: string
          module_id?: string | null
          module_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          last_page_index?: number
          last_tab?: string
          module_id?: string | null
          module_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resume_state_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resume_state_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
          prerequisite_course_id: string | null
          prerequisite_required: boolean | null
          price_cents: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
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
          prerequisite_course_id?: string | null
          prerequisite_required?: boolean | null
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
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
          prerequisite_course_id?: string | null
          prerequisite_required?: boolean | null
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      covered_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          generate_summary: boolean | null
          host_id: string
          id: string
          organization_id: string | null
          pre_meeting_context: Json | null
          record_audio: boolean | null
          related_module_id: string | null
          related_pipeline_stage: string | null
          scheduled_at: string | null
          session_type: string
          started_at: string | null
          status: string
          title: string
          track_actions: boolean | null
          transcribe: boolean | null
          updated_at: string
          video_call_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          generate_summary?: boolean | null
          host_id: string
          id?: string
          organization_id?: string | null
          pre_meeting_context?: Json | null
          record_audio?: boolean | null
          related_module_id?: string | null
          related_pipeline_stage?: string | null
          scheduled_at?: string | null
          session_type: string
          started_at?: string | null
          status?: string
          title: string
          track_actions?: boolean | null
          transcribe?: boolean | null
          updated_at?: string
          video_call_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          generate_summary?: boolean | null
          host_id?: string
          id?: string
          organization_id?: string | null
          pre_meeting_context?: Json | null
          record_audio?: boolean | null
          related_module_id?: string | null
          related_pipeline_stage?: string | null
          scheduled_at?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          title?: string
          track_actions?: boolean | null
          transcribe?: boolean | null
          updated_at?: string
          video_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "covered_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covered_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "covered_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "covered_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "covered_sessions_video_call_id_fkey"
            columns: ["video_call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
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
      curriculum_versions: {
        Row: {
          changelog: string | null
          comar_version_id: string | null
          course_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          updated_at: string
          version_number: string
        }
        Insert: {
          changelog?: string | null
          comar_version_id?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          version_number: string
        }
        Update: {
          changelog?: string | null
          comar_version_id?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_versions_comar_version_id_fkey"
            columns: ["comar_version_id"]
            isOneToOne: false
            referencedRelation: "comar_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_versions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
          registration_token_hash: string | null
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
          registration_token_hash?: string | null
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
          registration_token_hash?: string | null
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "dispensary_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensary_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      email_events: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          meta: Json | null
          org_id: string | null
          provider: string | null
          provider_message_id: string | null
          recipient_email: string
          retry_count: number | null
          status: string
          template_id: string | null
          template_version: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta?: Json | null
          org_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email: string
          retry_count?: number | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta?: Json | null
          org_id?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          retry_count?: number | null
          status?: string
          template_id?: string | null
          template_version?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_health_snapshot: {
        Row: {
          bounce_rate_24h: number | null
          circuit_reason: string | null
          circuit_state: string | null
          complaint_rate_24h: number | null
          created_at: string
          delivery_rate_24h: number | null
          emails_clicked_24h: number | null
          emails_delivered_24h: number | null
          emails_opened_24h: number | null
          emails_sent_24h: number | null
          failures_1h: number | null
          id: string
          last_provider_error: string | null
          latency_avg_ms: number | null
          queue_depth: number | null
        }
        Insert: {
          bounce_rate_24h?: number | null
          circuit_reason?: string | null
          circuit_state?: string | null
          complaint_rate_24h?: number | null
          created_at?: string
          delivery_rate_24h?: number | null
          emails_clicked_24h?: number | null
          emails_delivered_24h?: number | null
          emails_opened_24h?: number | null
          emails_sent_24h?: number | null
          failures_1h?: number | null
          id?: string
          last_provider_error?: string | null
          latency_avg_ms?: number | null
          queue_depth?: number | null
        }
        Update: {
          bounce_rate_24h?: number | null
          circuit_reason?: string | null
          circuit_state?: string | null
          complaint_rate_24h?: number | null
          created_at?: string
          delivery_rate_24h?: number | null
          emails_clicked_24h?: number | null
          emails_delivered_24h?: number | null
          emails_opened_24h?: number | null
          emails_sent_24h?: number | null
          failures_1h?: number | null
          id?: string
          last_provider_error?: string | null
          latency_avg_ms?: number | null
          queue_depth?: number | null
        }
        Relationships: []
      }
      email_inbox_messages: {
        Row: {
          ai_draft_response: string | null
          assigned_to: string | null
          body_html: string | null
          body_text: string | null
          classification: string | null
          from_email: string
          id: string
          linked_event_id: string | null
          linked_message_id: string | null
          meta: Json | null
          org_id: string | null
          priority: string | null
          received_at: string
          resolved_at: string | null
          status: string | null
          subject: string | null
          to_email: string
          user_id: string | null
        }
        Insert: {
          ai_draft_response?: string | null
          assigned_to?: string | null
          body_html?: string | null
          body_text?: string | null
          classification?: string | null
          from_email: string
          id?: string
          linked_event_id?: string | null
          linked_message_id?: string | null
          meta?: Json | null
          org_id?: string | null
          priority?: string | null
          received_at?: string
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          to_email: string
          user_id?: string | null
        }
        Update: {
          ai_draft_response?: string | null
          assigned_to?: string | null
          body_html?: string | null
          body_text?: string | null
          classification?: string | null
          from_email?: string
          id?: string
          linked_event_id?: string | null
          linked_message_id?: string | null
          meta?: Json | null
          org_id?: string | null
          priority?: string | null
          received_at?: string
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_inbox_messages_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "email_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_inbox_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "email_inbox_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_inbox_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
      email_outbox: {
        Row: {
          created_at: string | null
          cta_url: string | null
          environment: string | null
          error_message: string | null
          has_html: boolean | null
          has_text: boolean | null
          id: string
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          recipient_email: string
          rendered_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string
        }
        Insert: {
          created_at?: string | null
          cta_url?: string | null
          environment?: string | null
          error_message?: string | null
          has_html?: boolean | null
          has_text?: boolean | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email: string
          rendered_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name: string
        }
        Update: {
          created_at?: string | null
          cta_url?: string | null
          environment?: string | null
          error_message?: string | null
          has_html?: boolean | null
          has_text?: boolean | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          rendered_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string
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
          ai_personalization_enabled: boolean | null
          allowed_tone: string | null
          category: string | null
          contract_json: Json | null
          created_at: string | null
          created_by: string | null
          email_type: string | null
          html_content: string
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          requires_internal_badge: boolean | null
          subject_line: string
          template_name: string
          updated_at: string | null
          updated_by: string | null
          variables: Json
          version: number | null
        }
        Insert: {
          ai_personalization_enabled?: boolean | null
          allowed_tone?: string | null
          category?: string | null
          contract_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_type?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          requires_internal_badge?: boolean | null
          subject_line: string
          template_name: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json
          version?: number | null
        }
        Update: {
          ai_personalization_enabled?: boolean | null
          allowed_tone?: string | null
          category?: string | null
          contract_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          email_type?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          requires_internal_badge?: boolean | null
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
      entitlements: {
        Row: {
          course_id: string | null
          created_at: string
          entitlement_type: Database["public"]["Enums"]["entitlement_type"]
          granted_by: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          seat_id: string | null
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          entitlement_type?: Database["public"]["Enums"]["entitlement_type"]
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          seat_id?: string | null
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          entitlement_type?: Database["public"]["Enums"]["entitlement_type"]
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          seat_id?: string | null
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "rvt_seats"
            referencedColumns: ["id"]
          },
        ]
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
      exam_checkins: {
        Row: {
          attempt_id: string
          bypass_reason: string | null
          course_id: string
          created_at: string
          id: string
          photo_url: string | null
          status: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attempt_id: string
          bypass_reason?: string | null
          course_id: string
          created_at?: string
          id?: string
          photo_url?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attempt_id?: string
          bypass_reason?: string | null
          course_id?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_checkins_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
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
      first_shift_compliance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          days_until_shift: number | null
          employee_user_id: string
          first_shift_date: string
          id: string
          organization_id: string
          resolved_at: string | null
          training_status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          days_until_shift?: number | null
          employee_user_id: string
          first_shift_date: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          training_status: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          days_until_shift?: number | null
          employee_user_id?: string
          first_shift_date?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          training_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_shift_compliance_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "first_shift_compliance_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_shift_compliance_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
      incident_module_mappings: {
        Row: {
          created_at: string
          id: string
          incident_type: string
          is_required: boolean | null
          module_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_type: string
          is_required?: boolean | null
          module_id: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_type?: string
          is_required?: boolean | null
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_module_mappings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_retraining_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          incident_id: string
          module_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          incident_id: string
          module_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          incident_id?: string
          module_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_retraining_assignments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "compliance_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_retraining_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
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
      launch_audit_runs: {
        Row: {
          created_at: string
          failed_checks: Json
          findings: Json
          http_status: number | null
          id: string
          markdown_excerpt: string | null
          rollup_status: string | null
          route: string
          run_batch: string
          screenshot_path: string | null
          status: string
          triggered_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          failed_checks?: Json
          findings?: Json
          http_status?: number | null
          id?: string
          markdown_excerpt?: string | null
          rollup_status?: string | null
          route: string
          run_batch: string
          screenshot_path?: string | null
          status?: string
          triggered_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          failed_checks?: Json
          findings?: Json
          http_status?: number | null
          id?: string
          markdown_excerpt?: string | null
          rollup_status?: string | null
          route?: string
          run_batch?: string
          screenshot_path?: string | null
          status?: string
          triggered_by?: string | null
          url?: string
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
      message_mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
      module_attestations: {
        Row: {
          attestation_text: string
          attested_at: string
          course_id: string
          created_at: string
          curriculum_version_id: string | null
          id: string
          ip_address: unknown
          module_id: string
          trainer_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attestation_text?: string
          attested_at?: string
          course_id: string
          created_at?: string
          curriculum_version_id?: string | null
          id?: string
          ip_address?: unknown
          module_id: string
          trainer_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attestation_text?: string
          attested_at?: string
          course_id?: string
          created_at?: string
          curriculum_version_id?: string | null
          id?: string
          ip_address?: unknown
          module_id?: string
          trainer_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_attestations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_attestations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
      module_state_log: {
        Row: {
          course_id: string
          created_at: string | null
          from_state: string | null
          id: string
          metadata: Json | null
          module_id: string
          to_state: string
          trigger_event: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          from_state?: string | null
          id?: string
          metadata?: Json | null
          module_id: string
          to_state: string
          trigger_event: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          from_state?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string
          to_state?: string
          trigger_event?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_state_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_state_log_module_id_fkey"
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      org_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          member_type: Database["public"]["Enums"]["member_type"] | null
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          admin_approved: boolean | null
          admin_attestation_signed: boolean | null
          admin_attestation_signed_at: string | null
          admin_attestation_signed_by: string | null
          annual_price_cents: number | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          course_credits: number | null
          created_at: string
          current_uat_run_id: string | null
          environment: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_rotational_enabled: boolean | null
          license_number: string | null
          max_active_seats: number | null
          name: string
          payment_status: string | null
          paypal_order_id: string | null
          paypal_payer_id: string | null
          pricing_type: string | null
          ready_for_production: boolean | null
          require_supervisor_signoff: boolean | null
          rotational_buffer: number | null
          signoff_competency_areas: string[] | null
          stripe_customer_id: string | null
          stripe_session_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_tier: string | null
          uat_completed_at: string | null
          uat_email: string | null
          uat_enabled: boolean | null
          unique_access_key: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_approved?: boolean | null
          admin_attestation_signed?: boolean | null
          admin_attestation_signed_at?: string | null
          admin_attestation_signed_by?: string | null
          annual_price_cents?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_credits?: number | null
          created_at?: string
          current_uat_run_id?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_rotational_enabled?: boolean | null
          license_number?: string | null
          max_active_seats?: number | null
          name: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          pricing_type?: string | null
          ready_for_production?: boolean | null
          require_supervisor_signoff?: boolean | null
          rotational_buffer?: number | null
          signoff_competency_areas?: string[] | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          uat_completed_at?: string | null
          uat_email?: string | null
          uat_enabled?: boolean | null
          unique_access_key?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_approved?: boolean | null
          admin_attestation_signed?: boolean | null
          admin_attestation_signed_at?: string | null
          admin_attestation_signed_by?: string | null
          annual_price_cents?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          course_credits?: number | null
          created_at?: string
          current_uat_run_id?: string | null
          environment?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_rotational_enabled?: boolean | null
          license_number?: string | null
          max_active_seats?: number | null
          name?: string
          payment_status?: string | null
          paypal_order_id?: string | null
          paypal_payer_id?: string | null
          pricing_type?: string | null
          ready_for_production?: boolean | null
          require_supervisor_signoff?: boolean | null
          rotational_buffer?: number | null
          signoff_competency_areas?: string[] | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          uat_completed_at?: string | null
          uat_email?: string | null
          uat_enabled?: boolean | null
          unique_access_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_organizations_current_uat_run"
            columns: ["current_uat_run_id"]
            isOneToOne: false
            referencedRelation: "uat_runs"
            referencedColumns: ["id"]
          },
        ]
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
      payment_events: {
        Row: {
          amount: number | null
          application_id: string | null
          created_at: string | null
          currency: string | null
          error_message: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json | null
          paypal_event_id: string | null
          paypal_order_id: string | null
          processed_at: string | null
          purchase_id: string | null
          session_id: string | null
          status: string
          stripe_event_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          application_id?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          paypal_event_id?: string | null
          paypal_order_id?: string | null
          processed_at?: string | null
          purchase_id?: string | null
          session_id?: string | null
          status?: string
          stripe_event_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          application_id?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          paypal_event_id?: string | null
          paypal_order_id?: string | null
          processed_at?: string | null
          purchase_id?: string | null
          session_id?: string | null
          status?: string
          stripe_event_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "dispensary_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "rvt_purchases"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      pipeline_health_events: {
        Row: {
          auto_fixed: boolean | null
          created_at: string | null
          description: string
          fix_action: string | null
          id: string
          issue_type: string
          metadata: Json | null
          organization_id: string | null
          pipeline: string
          requires_admin: boolean | null
          severity: string
          user_id: string | null
        }
        Insert: {
          auto_fixed?: boolean | null
          created_at?: string | null
          description: string
          fix_action?: string | null
          id?: string
          issue_type: string
          metadata?: Json | null
          organization_id?: string | null
          pipeline: string
          requires_admin?: boolean | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          auto_fixed?: boolean | null
          created_at?: string | null
          description?: string
          fix_action?: string | null
          id?: string
          issue_type?: string
          metadata?: Json | null
          organization_id?: string | null
          pipeline?: string
          requires_admin?: boolean | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_health_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pipeline_health_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_health_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
      pipeline_health_snapshot: {
        Row: {
          allocated_seats: number | null
          auto_fixed_today: number | null
          created_at: string | null
          healthy_orgs: number | null
          id: string
          issues_detected: number | null
          last_run_at: string | null
          last_run_duration_ms: number | null
          needs_admin_attention: number | null
          orgs_with_issues: number | null
          pipelines_healthy: number | null
          pipelines_total: number | null
          seat_mismatches: number | null
          stalled_users: number | null
          total_certified: number | null
          total_in_training: number | null
          total_orgs: number | null
          total_seats: number | null
          unregistered_managers: number | null
          updated_at: string | null
        }
        Insert: {
          allocated_seats?: number | null
          auto_fixed_today?: number | null
          created_at?: string | null
          healthy_orgs?: number | null
          id?: string
          issues_detected?: number | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          needs_admin_attention?: number | null
          orgs_with_issues?: number | null
          pipelines_healthy?: number | null
          pipelines_total?: number | null
          seat_mismatches?: number | null
          stalled_users?: number | null
          total_certified?: number | null
          total_in_training?: number | null
          total_orgs?: number | null
          total_seats?: number | null
          unregistered_managers?: number | null
          updated_at?: string | null
        }
        Update: {
          allocated_seats?: number | null
          auto_fixed_today?: number | null
          created_at?: string | null
          healthy_orgs?: number | null
          id?: string
          issues_detected?: number | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          needs_admin_attention?: number | null
          orgs_with_issues?: number | null
          pipelines_healthy?: number | null
          pipelines_total?: number | null
          seat_mismatches?: number | null
          stalled_users?: number | null
          total_certified?: number | null
          total_in_training?: number | null
          total_orgs?: number | null
          total_seats?: number | null
          unregistered_managers?: number | null
          updated_at?: string | null
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
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          dispensary_access_key: string | null
          email_cache: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          first_shift_date: string | null
          id: string
          is_verified: boolean | null
          job_role: Database["public"]["Enums"]["job_role"] | null
          job_title: string | null
          last_name: string | null
          mca_registration_number: string | null
          organization: string | null
          organization_id: string | null
          phone: string | null
          phone_verified: boolean | null
          preferred_language: string
          profile_photo_url: string | null
          state: string | null
          tier_status: string | null
          training_verified_at: string | null
          training_verified_by: string | null
          updated_at: string
          user_id: string
          verification_method_preference: string | null
          welcome_video_watched: boolean | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          dispensary_access_key?: string | null
          email_cache?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          first_shift_date?: string | null
          id?: string
          is_verified?: boolean | null
          job_role?: Database["public"]["Enums"]["job_role"] | null
          job_title?: string | null
          last_name?: string | null
          mca_registration_number?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string
          profile_photo_url?: string | null
          state?: string | null
          tier_status?: string | null
          training_verified_at?: string | null
          training_verified_by?: string | null
          updated_at?: string
          user_id: string
          verification_method_preference?: string | null
          welcome_video_watched?: boolean | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          dispensary_access_key?: string | null
          email_cache?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          first_shift_date?: string | null
          id?: string
          is_verified?: boolean | null
          job_role?: Database["public"]["Enums"]["job_role"] | null
          job_title?: string | null
          last_name?: string | null
          mca_registration_number?: string | null
          organization?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_language?: string
          profile_photo_url?: string | null
          state?: string | null
          tier_status?: string | null
          training_verified_at?: string | null
          training_verified_by?: string | null
          updated_at?: string
          user_id?: string
          verification_method_preference?: string | null
          welcome_video_watched?: boolean | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      profiles_private: {
        Row: {
          address_encrypted: string | null
          created_at: string
          dob_encrypted: string | null
          emergency_contact_encrypted: string | null
          encryption_version: number | null
          mca_number_encrypted: string | null
          phone_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_encrypted?: string | null
          created_at?: string
          dob_encrypted?: string | null
          emergency_contact_encrypted?: string | null
          encryption_version?: number | null
          mca_number_encrypted?: string | null
          phone_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_encrypted?: string | null
          created_at?: string
          dob_encrypted?: string | null
          emergency_contact_encrypted?: string | null
          encryption_version?: number | null
          mca_number_encrypted?: string | null
          phone_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      regression_runs: {
        Row: {
          created_at: string
          deterministic: boolean | null
          duration_ms: number | null
          error: string | null
          id: string
          migration_version: string
          report_path: string | null
          run1_summary: Json | null
          run2_summary: Json | null
          status: string
          triggered_by: string
          updated_at: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          deterministic?: boolean | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          migration_version: string
          report_path?: string | null
          run1_summary?: Json | null
          run2_summary?: Json | null
          status?: string
          triggered_by?: string
          updated_at?: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          deterministic?: boolean | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          migration_version?: string
          report_path?: string | null
          run1_summary?: Json | null
          run2_summary?: Json | null
          status?: string
          triggered_by?: string
          updated_at?: string
          verdict?: string | null
        }
        Relationships: []
      }
      regression_settings: {
        Row: {
          auto_enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          auto_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          auto_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
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
      retraining_events: {
        Row: {
          created_at: string
          employee_user_id: string
          id: string
          incident_id: string | null
          module_id: string
          organization_id: string
          reason: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          employee_user_id: string
          id?: string
          incident_id?: string | null
          module_id: string
          organization_id: string
          reason: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          employee_user_id?: string
          id?: string
          incident_id?: string | null
          module_id?: string
          organization_id?: string
          reason?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retraining_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "compliance_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retraining_events_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retraining_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "retraining_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retraining_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
      role_module_requirements: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          job_role: Database["public"]["Enums"]["job_role"]
          module_id: string
          priority_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          job_role: Database["public"]["Enums"]["job_role"]
          module_id: string
          priority_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          job_role?: Database["public"]["Enums"]["job_role"]
          module_id?: string
          priority_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_module_requirements_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
      role_requests: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          organization_id: string | null
          requested_member_type: Database["public"]["Enums"]["member_type"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["role_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          organization_id?: string | null
          requested_member_type: Database["public"]["Enums"]["member_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["role_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          organization_id?: string | null
          requested_member_type?: Database["public"]["Enums"]["member_type"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["role_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "role_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rvt_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rvt_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rvt_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rvt_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "rvt_seats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rvt_seats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      scheduled_call_invites: {
        Row: {
          created_at: string | null
          id: string
          notified_at: string | null
          responded_at: string | null
          scheduled_call_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notified_at?: string | null
          responded_at?: string | null
          scheduled_call_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notified_at?: string | null
          responded_at?: string | null
          scheduled_call_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_call_invites_scheduled_call_id_fkey"
            columns: ["scheduled_call_id"]
            isOneToOne: false
            referencedRelation: "scheduled_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_calls: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          host_id: string
          id: string
          organization_id: string | null
          recurring_pattern: Json | null
          reminder_sent: boolean | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string | null
          video_call_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_id: string
          id?: string
          organization_id?: string | null
          recurring_pattern?: Json | null
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string | null
          video_call_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          host_id?: string
          id?: string
          organization_id?: string | null
          recurring_pattern?: Json | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          video_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scheduled_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scheduled_calls_video_call_id_fkey"
            columns: ["video_call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reviews: {
        Row: {
          action_items: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string
          findings: string | null
          id: string
          metadata: Json | null
          organization_id: string
          review_name: string
          review_type: string
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date: string
          findings?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          review_name: string
          review_type: string
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string
          findings?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          review_name?: string
          review_type?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "scheduled_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      seat_rotation_history: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_user_id: string | null
          organization_id: string | null
          performed_by: string | null
          previous_user_id: string | null
          reason: string | null
          seat_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_user_id?: string | null
          organization_id?: string | null
          performed_by?: string | null
          previous_user_id?: string | null
          reason?: string | null
          seat_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_user_id?: string | null
          organization_id?: string | null
          performed_by?: string | null
          previous_user_id?: string | null
          reason?: string | null
          seat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_rotation_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seat_rotation_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_rotation_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seat_rotation_history_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "rvt_seats"
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      session_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          linked_module_id: string | null
          linked_org_id: string | null
          linked_pipeline_stage: string | null
          owner_id: string | null
          owner_name: string | null
          priority: string | null
          session_id: string
          status: string | null
          task_description: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          linked_module_id?: string | null
          linked_org_id?: string | null
          linked_pipeline_stage?: string | null
          owner_id?: string | null
          owner_name?: string | null
          priority?: string | null
          session_id: string
          status?: string | null
          task_description: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          linked_module_id?: string | null
          linked_org_id?: string | null
          linked_pipeline_stage?: string | null
          owner_id?: string | null
          owner_name?: string | null
          priority?: string | null
          session_id?: string
          status?: string | null
          task_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_actions_linked_org_id_fkey"
            columns: ["linked_org_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_actions_linked_org_id_fkey"
            columns: ["linked_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_actions_linked_org_id_fkey"
            columns: ["linked_org_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "covered_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_decisions: {
        Row: {
          context: string | null
          created_at: string
          decided_by: string | null
          decided_by_id: string | null
          decision_text: string
          id: string
          impacted_org_id: string | null
          impacted_pipeline: string | null
          session_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          decided_by?: string | null
          decided_by_id?: string | null
          decision_text: string
          id?: string
          impacted_org_id?: string | null
          impacted_pipeline?: string | null
          session_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          decided_by?: string | null
          decided_by_id?: string | null
          decision_text?: string
          id?: string
          impacted_org_id?: string | null
          impacted_pipeline?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_decisions_impacted_org_id_fkey"
            columns: ["impacted_org_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_decisions_impacted_org_id_fkey"
            columns: ["impacted_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_decisions_impacted_org_id_fkey"
            columns: ["impacted_org_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "session_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "covered_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          consent_given: boolean | null
          consent_given_at: string | null
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          participant_name: string
          participant_role: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_name: string
          participant_role?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          consent_given?: boolean | null
          consent_given_at?: string | null
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_name?: string
          participant_role?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "covered_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_summaries: {
        Row: {
          created_at: string
          duration_minutes: number | null
          executive_summary: string | null
          generated_at: string | null
          id: string
          key_outcomes: Json | null
          model_used: string | null
          participant_count: number | null
          risks_identified: Json | null
          session_id: string
          topics_discussed: Json | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          executive_summary?: string | null
          generated_at?: string | null
          id?: string
          key_outcomes?: Json | null
          model_used?: string | null
          participant_count?: number | null
          risks_identified?: Json | null
          session_id: string
          topics_discussed?: Json | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          executive_summary?: string | null
          generated_at?: string | null
          id?: string
          key_outcomes?: Json | null
          model_used?: string | null
          participant_count?: number | null
          risks_identified?: Json | null
          session_id?: string
          topics_discussed?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "covered_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          confidence: number | null
          content: string
          created_at: string
          id: string
          session_id: string
          speaker_id: string | null
          speaker_name: string | null
          timestamp_end: number | null
          timestamp_start: number
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string
          id?: string
          session_id: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp_end?: number | null
          timestamp_start: number
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          speaker_id?: string | null
          speaker_name?: string | null
          timestamp_end?: number | null
          timestamp_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "covered_sessions"
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
          invitation_token_hash: string | null
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
          invitation_token_hash?: string | null
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
          invitation_token_hash?: string | null
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "staff_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      subscription_history: {
        Row: {
          action_type: string
          amount_cents: number | null
          created_at: string | null
          id: string
          new_tier: string
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_reference: string | null
          performed_by: string | null
          previous_tier: string | null
          proration_amount_cents: number | null
        }
        Insert: {
          action_type: string
          amount_cents?: number | null
          created_at?: string | null
          id?: string
          new_tier: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          performed_by?: string | null
          previous_tier?: string | null
          proration_amount_cents?: number | null
        }
        Update: {
          action_type?: string
          amount_cents?: number | null
          created_at?: string | null
          id?: string
          new_tier?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          performed_by?: string | null
          previous_tier?: string | null
          proration_amount_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          annual_price_cents: number
          created_at: string | null
          display_name: string
          display_order: number
          features: Json | null
          id: string
          is_active: boolean | null
          max_active_seats: number
          rotational_buffer: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          annual_price_cents: number
          created_at?: string | null
          display_name: string
          display_order: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_active_seats: number
          rotational_buffer: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          annual_price_cents?: number
          created_at?: string | null
          display_name?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_active_seats?: number
          rotational_buffer?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supervisor_signoffs: {
        Row: {
          competency_area: string
          created_at: string
          employee_user_id: string
          expires_at: string | null
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          is_floor_observation: boolean | null
          module_id: string | null
          module_version: number | null
          notes: string | null
          observation_date: string | null
          organization_id: string
          signed_off_at: string
          supervisor_user_id: string
          valid: boolean | null
        }
        Insert: {
          competency_area: string
          created_at?: string
          employee_user_id: string
          expires_at?: string | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          is_floor_observation?: boolean | null
          module_id?: string | null
          module_version?: number | null
          notes?: string | null
          observation_date?: string | null
          organization_id: string
          signed_off_at?: string
          supervisor_user_id: string
          valid?: boolean | null
        }
        Update: {
          competency_area?: string
          created_at?: string
          employee_user_id?: string
          expires_at?: string | null
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          is_floor_observation?: boolean | null
          module_id?: string | null
          module_version?: number | null
          notes?: string | null
          observation_date?: string | null
          organization_id?: string
          signed_off_at?: string
          supervisor_user_id?: string
          valid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_signoffs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_signoffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supervisor_signoffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_signoffs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      support_request_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean | null
          message_text: string
          sender_id: string
          support_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message_text: string
          sender_id: string
          support_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message_text?: string
          sender_id?: string
          support_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_messages_support_request_id_fkey"
            columns: ["support_request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_to: string | null
          conversation_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          priority: string
          request_type: string
          requester_id: string
          resolved_at: string | null
          resolved_by: string | null
          scheduled_call_time: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string
          request_type: string
          requester_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_call_time?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          priority?: string
          request_type?: string
          requester_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_call_time?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "support_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "system_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      token_redemptions: {
        Row: {
          id: string
          ip_address: string | null
          metadata: Json | null
          redeemed_at: string
          redeemed_by: string | null
          token_hash: string
          token_type: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          redeemed_at?: string
          redeemed_by?: string | null
          token_hash: string
          token_type: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          redeemed_at?: string
          redeemed_by?: string | null
          token_hash?: string
          token_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      trainer_certifications: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          certification_type: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string
          notes: string | null
          organization_id: string | null
          scope: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          certification_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          organization_id?: string | null
          scope?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          certification_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          organization_id?: string | null
          scope?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "trainer_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      training_questions: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          conversation_id: string
          created_at: string
          id: string
          question: string
          status: string
          user_id: string
          user_name: string
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          question: string
          status?: string
          user_id: string
          user_name: string
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          question?: string
          status?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_questions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_version_mismatches: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          course_id: string
          created_at: string
          current_version_id: string | null
          id: string
          retraining_assigned_at: string | null
          retraining_required: boolean | null
          trained_version_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          course_id: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          retraining_assigned_at?: string | null
          retraining_required?: boolean | null
          trained_version_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          course_id?: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          retraining_assigned_at?: string | null
          retraining_required?: boolean | null
          trained_version_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_version_mismatches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_version_mismatches_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_version_mismatches_trained_version_id_fkey"
            columns: ["trained_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uat_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      uat_evidence: {
        Row: {
          action_performed: string
          actual_result: string | null
          created_at: string | null
          download_link: string | null
          expected_result: string | null
          id: string
          notes: string | null
          passed: boolean | null
          record_ids: Json | null
          role_used: string | null
          run_id: string | null
          screenshot_path: string | null
          task_id: string | null
          tester_email: string
          updated_at: string | null
        }
        Insert: {
          action_performed: string
          actual_result?: string | null
          created_at?: string | null
          download_link?: string | null
          expected_result?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          record_ids?: Json | null
          role_used?: string | null
          run_id?: string | null
          screenshot_path?: string | null
          task_id?: string | null
          tester_email: string
          updated_at?: string | null
        }
        Update: {
          action_performed?: string
          actual_result?: string | null
          created_at?: string | null
          download_link?: string | null
          expected_result?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          record_ids?: Json | null
          role_used?: string | null
          run_id?: string | null
          screenshot_path?: string | null
          task_id?: string | null
          tester_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uat_evidence_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "uat_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "uat_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      uat_runs: {
        Row: {
          checklist_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          run_code: string
          started_at: string | null
          started_by: string | null
          status: string | null
          summary_metrics: Json | null
          updated_at: string | null
        }
        Insert: {
          checklist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          run_code: string
          started_at?: string | null
          started_by?: string | null
          status?: string | null
          summary_metrics?: Json | null
          updated_at?: string | null
        }
        Update: {
          checklist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          run_code?: string
          started_at?: string | null
          started_by?: string | null
          status?: string | null
          summary_metrics?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uat_runs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "uat_validation_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uat_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      uat_seed_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          notes: string | null
          seed_batch: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          notes?: string | null
          seed_batch?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          notes?: string | null
          seed_batch?: string
        }
        Relationships: []
      }
      uat_task_templates: {
        Row: {
          created_at: string
          deep_link: string | null
          description: string
          expected_result: string
          id: string
          priority: number
          role_to_test: string
          sort_order: number
          task_code: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deep_link?: string | null
          description: string
          expected_result: string
          id?: string
          priority?: number
          role_to_test: string
          sort_order?: number
          task_code: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deep_link?: string | null
          description?: string
          expected_result?: string
          id?: string
          priority?: number
          role_to_test?: string
          sort_order?: number
          task_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      uat_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deep_link: string | null
          description: string | null
          evidence: string | null
          evidence_file_path: string | null
          expected_result: string | null
          id: string
          organization_id: string
          priority: number | null
          role_to_test: string | null
          run_id: string
          status: string | null
          task_code: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deep_link?: string | null
          description?: string | null
          evidence?: string | null
          evidence_file_path?: string | null
          expected_result?: string | null
          id?: string
          organization_id: string
          priority?: number | null
          role_to_test?: string | null
          run_id: string
          status?: string | null
          task_code?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deep_link?: string | null
          description?: string | null
          evidence?: string | null
          evidence_file_path?: string | null
          expected_result?: string | null
          id?: string
          organization_id?: string
          priority?: number | null
          role_to_test?: string | null
          run_id?: string
          status?: string | null
          task_code?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uat_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uat_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uat_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "uat_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      uat_test_results: {
        Row: {
          actual_result: string | null
          created_at: string
          expected_result: string | null
          id: string
          notes: string | null
          role: string
          scenario: string
          status: string
          steps: string | null
          test_id: string
          tested_at: string | null
          tested_by: string | null
          updated_at: string
        }
        Insert: {
          actual_result?: string | null
          created_at?: string
          expected_result?: string | null
          id?: string
          notes?: string | null
          role: string
          scenario: string
          status?: string
          steps?: string | null
          test_id: string
          tested_at?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Update: {
          actual_result?: string | null
          created_at?: string
          expected_result?: string | null
          id?: string
          notes?: string | null
          role?: string
          scenario?: string
          status?: string
          steps?: string | null
          test_id?: string
          tested_at?: string | null
          tested_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uat_validation_checklists: {
        Row: {
          audit_readiness_section: Json | null
          auth_section: Json | null
          blocker_concerns: string | null
          bulk_operations_section: Json | null
          certificates_section: Json | null
          company_name: string
          confident_explanation: string | null
          confident_for_auditor: boolean | null
          created_at: string | null
          dashboard_metrics_section: Json | null
          id: string
          incident_workflow_section: Json | null
          module_version_section: Json | null
          notifications_section: Json | null
          organization_id: string | null
          overall_status: string | null
          packet_content_section: Json | null
          packet_export_section: Json | null
          payment_testing_section: Json | null
          primary_test_email: string
          retraining_section: Json | null
          roles_tested: string[] | null
          signature_name: string | null
          signed_at: string | null
          signoffs_section: Json | null
          submitted_at: string | null
          test_organization_name: string | null
          tester_name: string
          tester_user_id: string
          testers: Json | null
          testing_dates: Json | null
          updated_at: string | null
          what_was_confusing: string | null
          what_worked_well: string | null
        }
        Insert: {
          audit_readiness_section?: Json | null
          auth_section?: Json | null
          blocker_concerns?: string | null
          bulk_operations_section?: Json | null
          certificates_section?: Json | null
          company_name: string
          confident_explanation?: string | null
          confident_for_auditor?: boolean | null
          created_at?: string | null
          dashboard_metrics_section?: Json | null
          id?: string
          incident_workflow_section?: Json | null
          module_version_section?: Json | null
          notifications_section?: Json | null
          organization_id?: string | null
          overall_status?: string | null
          packet_content_section?: Json | null
          packet_export_section?: Json | null
          payment_testing_section?: Json | null
          primary_test_email: string
          retraining_section?: Json | null
          roles_tested?: string[] | null
          signature_name?: string | null
          signed_at?: string | null
          signoffs_section?: Json | null
          submitted_at?: string | null
          test_organization_name?: string | null
          tester_name: string
          tester_user_id: string
          testers?: Json | null
          testing_dates?: Json | null
          updated_at?: string | null
          what_was_confusing?: string | null
          what_worked_well?: string | null
        }
        Update: {
          audit_readiness_section?: Json | null
          auth_section?: Json | null
          blocker_concerns?: string | null
          bulk_operations_section?: Json | null
          certificates_section?: Json | null
          company_name?: string
          confident_explanation?: string | null
          confident_for_auditor?: boolean | null
          created_at?: string | null
          dashboard_metrics_section?: Json | null
          id?: string
          incident_workflow_section?: Json | null
          module_version_section?: Json | null
          notifications_section?: Json | null
          organization_id?: string | null
          overall_status?: string | null
          packet_content_section?: Json | null
          packet_export_section?: Json | null
          payment_testing_section?: Json | null
          primary_test_email?: string
          retraining_section?: Json | null
          roles_tested?: string[] | null
          signature_name?: string | null
          signed_at?: string | null
          signoffs_section?: Json | null
          submitted_at?: string | null
          test_organization_name?: string | null
          tester_name?: string
          tester_user_id?: string
          testers?: Json | null
          testing_dates?: Json | null
          updated_at?: string | null
          what_was_confusing?: string | null
          what_worked_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uat_validation_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uat_validation_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uat_validation_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      user_certificates: {
        Row: {
          certificate_name: string
          course_id: string
          created_at: string
          expires_at: string | null
          guest_email: string | null
          id: string
          issued_at: string
          metadata: Json | null
          pdf_url: string | null
          recipient_name: string | null
          status: string
          user_id: string | null
          verification_code: string
        }
        Insert: {
          certificate_name: string
          course_id: string
          created_at?: string
          expires_at?: string | null
          guest_email?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          pdf_url?: string | null
          recipient_name?: string | null
          status?: string
          user_id?: string | null
          verification_code: string
        }
        Update: {
          certificate_name?: string
          course_id?: string
          created_at?: string
          expires_at?: string | null
          guest_email?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          pdf_url?: string | null
          recipient_name?: string | null
          status?: string
          user_id?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_learning_journey_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_journey_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
          curriculum_version_id: string | null
          id: string
          is_completed: boolean | null
          module_id: string | null
          score: number | null
          tier_unlocked_at: string | null
          time_spent: number | null
          trainer_id: string | null
          training_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          current_tier?: string | null
          curriculum_version_id?: string | null
          id?: string
          is_completed?: boolean | null
          module_id?: string | null
          score?: number | null
          tier_unlocked_at?: string | null
          time_spent?: number | null
          trainer_id?: string | null
          training_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          current_tier?: string | null
          curriculum_version_id?: string | null
          id?: string
          is_completed?: boolean | null
          module_id?: string | null
          score?: number | null
          tier_unlocked_at?: string | null
          time_spent?: number | null
          trainer_id?: string | null
          training_method?: string | null
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
            foreignKeyName: "user_progress_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
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
          access_level: string
          asset_key: string
          bucket_id: string
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          fallback_bucket_id: string | null
          fallback_storage_path: string | null
          file_size_mb: number | null
          id: string
          is_active: boolean | null
          mime_type: string
          module_id: string | null
          public_url: string | null
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          unmapped_reason: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          asset_key: string
          bucket_id?: string
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          fallback_bucket_id?: string | null
          fallback_storage_path?: string | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string
          module_id?: string | null
          public_url?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          unmapped_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          asset_key?: string
          bucket_id?: string
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          fallback_bucket_id?: string | null
          fallback_storage_path?: string | null
          file_size_mb?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string
          module_id?: string | null
          public_url?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          unmapped_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
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
          recording_duration_seconds: number | null
          recording_egress_id: string | null
          recording_size_mb: number | null
          recording_started_at: string | null
          recording_status: string | null
          recording_url: string | null
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
          recording_duration_seconds?: number | null
          recording_egress_id?: string | null
          recording_size_mb?: number | null
          recording_started_at?: string | null
          recording_status?: string | null
          recording_url?: string | null
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
          recording_duration_seconds?: number | null
          recording_egress_id?: string | null
          recording_size_mb?: number | null
          recording_started_at?: string | null
          recording_status?: string | null
          recording_url?: string | null
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
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "video_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_calls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
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
      compliance_dashboard_metrics: {
        Row: {
          certified_employees: number | null
          expiring_certs_30d: number | null
          invalid_signoffs: number | null
          open_incidents: number | null
          organization_id: string | null
          organization_name: string | null
          overdue_reviews: number | null
          retraining_30d: number | null
          total_employees: number | null
        }
        Insert: {
          certified_employees?: never
          expiring_certs_30d?: never
          invalid_signoffs?: never
          open_incidents?: never
          organization_id?: string | null
          organization_name?: string | null
          overdue_reviews?: never
          retraining_30d?: never
          total_employees?: never
        }
        Update: {
          certified_employees?: never
          expiring_certs_30d?: never
          invalid_signoffs?: never
          open_incidents?: never
          organization_id?: string | null
          organization_name?: string | null
          overdue_reviews?: never
          retraining_30d?: never
          total_employees?: never
        }
        Relationships: []
      }
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
      launch_audit_batch_summary: {
        Row: {
          ended_at: string | null
          fail_count: number | null
          pass_count: number | null
          rollup_status: string | null
          run_batch: string | null
          started_at: string | null
          total_routes: number | null
          warn_count: number | null
          welcome_intro_probe: Json | null
        }
        Relationships: []
      }
      org_certification_summary: {
        Row: {
          certificates_issued: number | null
          certification_rate: number | null
          completed_users: number | null
          entitled_users: number | null
          in_progress_users: number | null
          organization_id: string | null
          total_members: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "compliance_dashboard_metrics"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_compliance_health"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      payment_audit_user_hint: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string | null
          extracted_email: string | null
          extracted_user_id: string | null
          id: string | null
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string | null
          extracted_email?: never
          extracted_user_id?: never
          id?: string | null
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string | null
          extracted_email?: never
          extracted_user_id?: never
          id?: string | null
          order_id?: string | null
        }
        Relationships: []
      }
      unified_audit_timeline: {
        Row: {
          audit_source: string | null
          created_at: string | null
          event_data: Json | null
          event_id: string | null
          event_type: string | null
          user_id: string | null
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
      v_pipeline_compliance_health: {
        Row: {
          certification_rate: number | null
          certified_employees: number | null
          compliance_status: string | null
          missing_signoffs: number | null
          organization_id: string | null
          organization_name: string | null
          overdue_reviews: number | null
          pending_retraining: number | null
          total_employees: number | null
          working_uncertified: number | null
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
          funnel_cert_delivered: number | null
          funnel_cert_generated: number | null
          funnel_cert_passed: number | null
          funnel_cert_took_exam: number | null
          funnel_dispensary_applied: number | null
          funnel_dispensary_approved: number | null
          funnel_dispensary_registered: number | null
          funnel_dispensary_seats_purchased: number | null
          funnel_employee_completed: number | null
          funnel_employee_invited: number | null
          funnel_employee_registered: number | null
          funnel_employee_started: number | null
          funnel_employee_took_exam: number | null
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
      accept_invite_for_existing_user: {
        Args: { p_invite_token: string; p_user_id: string }
        Returns: Json
      }
      allocate_additional_seats: {
        Args: { p_note?: string; p_org_id: string; p_seats_to_add: number }
        Returns: Json
      }
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
          error_code: string
          invite_required: boolean
          join_code: string
          message: string
          organization_id: string
          purchase_id: string
          success: boolean
        }[]
      }
      archive_user_seat: {
        Args: { p_performed_by?: string; p_reason?: string; p_user_id: string }
        Returns: Json
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
      check_access_key_rate_limit: {
        Args: { user_ip: string }
        Returns: boolean
      }
      check_course_prerequisite: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: Json
      }
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
      check_seat_capacity: { Args: { org_id: string }; Returns: Json }
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
      count_unmapped_modules: { Args: never; Returns: Json }
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
      decrypt_pii: { Args: { encrypted_data: string }; Returns: string }
      delete_dispensary_application: {
        Args: { p_application_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      deprovision_user: {
        Args: { p_deactivated_by?: string; p_user_id: string }
        Returns: Json
      }
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
      encrypt_pii: { Args: { plaintext: string }; Returns: string }
      enqueue_regression_if_new: { Args: never; Returns: undefined }
      evaluate_and_issue_certificate:
        | {
            Args: {
              p_course_id: string
              p_guest_email?: string
              p_recipient_name?: string
            }
            Returns: Json
          }
        | { Args: { p_course_id: string; p_user_id: string }; Returns: Json }
      expire_test_organizations: { Args: never; Returns: undefined }
      fix_manager_registration: {
        Args: { p_application_id: string; p_user_email: string }
        Returns: Json
      }
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
      generate_verification_code: {
        Args: { p_prefix: string }
        Returns: string
      }
      get_access_snapshot: { Args: { p_course_id?: string }; Returns: Json }
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
      get_approved_organizations: {
        Args: never
        Returns: {
          available_seats: number
          certified_count: number
          dispensary_number: string
          employee_count: number
          join_code: string
          license_number: string
          manager_email: string
          manager_name: string
          manager_registered: boolean
          org_id: string
          organization_name: string
          payment_status: string
          registration_token_expires_at: string
          total_seats: number
          used_seats: number
        }[]
      }
      get_at_risk_students: {
        Args: { p_org_id: string }
        Returns: {
          completion_percent: number
          days_inactive: number
          email: string
          first_name: string
          last_name: string
          risk_level: string
          user_id: string
        }[]
      }
      get_certificate_secure: {
        Args: { cert_id: string }
        Returns: {
          certificate_number: string
          course_id: string
          expiry_date: string
          id: string
          is_revoked: boolean
          issue_date: string
          status: string
          user_id: string
        }[]
      }
      get_course_launch_target: { Args: { p_course_id: string }; Returns: Json }
      get_course_state: { Args: { p_course_id: string }; Returns: Json }
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
      get_highest_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      get_last_comar_review: { Args: never; Returns: string }
      get_launch_readiness: { Args: never; Returns: Json }
      get_managed_org_ids: { Args: { _user_id: string }; Returns: string[] }
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
      get_organization_subscription_status: {
        Args: { org_id: string }
        Returns: Json
      }
      get_private_profile: {
        Args: { p_user_id: string }
        Returns: {
          address: string
          dob: string
          emergency_contact: string
          mca_number: string
          phone: string
          user_id: string
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
      get_recent_certificate_activity: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
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
      has_any_member_type: {
        Args: {
          _member_types: Database["public"]["Enums"]["member_type"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_management_role: { Args: { p_user_id: string }; Returns: boolean }
      has_member_type: {
        Args: {
          _member_types: Database["public"]["Enums"]["member_type"][]
          _org_id: string
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
      hash_token: { Args: { token: string }; Returns: string }
      install_regression_vault_secret: {
        Args: { _value: string }
        Returns: string
      }
      invalidate_pending_invites: {
        Args: { p_email: string; p_organization_id?: string }
        Returns: number
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
      is_org_member: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
      }
      is_own_profile: {
        Args: { _profile_user_id: string; _user_id: string }
        Returns: boolean
      }
      is_same_organization: {
        Args: { target_user_id: string; viewer_id: string }
        Returns: boolean
      }
      jwt_org_id: { Args: never; Returns: string }
      jwt_role: { Args: never; Returns: string }
      log_exam_identity_verification: {
        Args: { p_checkin_id: string }
        Returns: undefined
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
      purge_uat_seed_entities: { Args: { _batch?: string }; Returns: Json }
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
      reactivate_organization: {
        Args: { p_org_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      reconcile_payment_status: {
        Args: { p_session_id: string }
        Returns: Json
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
      regenerate_manager_token_by_org: {
        Args: { org_id: string }
        Returns: {
          application_id: string
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
      reprovision_user: {
        Args: { p_organization_id: string; p_role?: string; p_user_id: string }
        Returns: Json
      }
      reset_exam_state: {
        Args: { p_course_id?: string; p_target_user_id: string }
        Returns: Json
      }
      run_pipeline_health_check: { Args: never; Returns: Json }
      safe_assign_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      safe_assign_seat_to_user: {
        Args: {
          p_course_id?: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: string
      }
      safe_complete_module: {
        Args: {
          p_course_id: string
          p_module_id: string
          p_score?: number
          p_time_spent?: number
          p_user_id: string
        }
        Returns: string
      }
      safe_error_message: {
        Args: { internal_error: string; public_message?: string }
        Returns: string
      }
      safe_upsert_learning_journey: {
        Args: {
          p_current_stage?: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: string
      }
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
      setup_comar_scrape_cron: { Args: { secret: string }; Returns: string }
      start_exam_with_checkin: {
        Args: {
          p_bypass_reason?: string
          p_course_id: string
          p_ip_address?: string
          p_metadata?: Json
          p_photo_url?: string
        }
        Returns: Json
      }
      start_uat_run: { Args: { p_organization_id?: string }; Returns: string }
      submit_uat_step: {
        Args: {
          p_evidence_path?: string
          p_notes?: string
          p_result: string
          p_task_id: string
        }
        Returns: undefined
      }
      suspend_organization: {
        Args: { p_org_id: string; p_reason?: string }
        Returns: {
          message: string
          success: boolean
        }[]
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
      update_module_progress_state: {
        Args: {
          p_course_id: string
          p_metadata?: Json
          p_module_id: string
          p_new_state: string
          p_trigger_event: string
          p_user_id: string
        }
        Returns: Json
      }
      upgrade_subscription_tier: {
        Args: {
          new_tier_name: string
          org_id: string
          payment_ref?: string
          performed_by_id?: string
        }
        Returns: Json
      }
      upsert_private_profile: {
        Args: {
          p_address?: string
          p_dob?: string
          p_emergency_contact?: string
          p_mca_number?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: undefined
      }
      upsert_resume_state: {
        Args: {
          p_course_id: string
          p_last_page_index?: number
          p_last_tab?: string
          p_module_id?: string
          p_module_number?: number
        }
        Returns: Json
      }
      user_can_view_profile: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      validate_caller_org_access: {
        Args: { caller_user_id: string; target_org_id: string }
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
      validate_rvt_join_code_public: {
        Args: { p_code: string }
        Returns: {
          has_capacity: boolean
          is_expired: boolean
          is_valid: boolean
        }[]
      }
      verify_certificate:
        | { Args: { p_code: string }; Returns: Json }
        | {
            Args: {
              p_code?: string
              p_course_id?: string
              p_first_name?: string
              p_last_initial?: string
              p_year?: number
            }
            Returns: Json
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
      verify_consumer_certificate_public: {
        Args: { p_code: string }
        Returns: {
          badge_name: string
          certificate_number: string
          course_title: string
          is_valid: boolean
          issue_date: string
        }[]
      }
      verify_token_hash: {
        Args: { stored_hash: string; token: string }
        Returns: boolean
      }
    }
    Enums: {
      access_deny_reason:
        | "none"
        | "enrollment_required"
        | "payment_required"
        | "org_seat_required"
        | "suspended"
        | "expired"
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
        | "trainer"
      entitlement_status: "active" | "expired" | "suspended" | "revoked"
      entitlement_type: "trial" | "paid" | "org_seat" | "admin_granted"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status: "reported" | "investigating" | "resolved" | "closed"
      job_role:
        | "budtender"
        | "security"
        | "intake"
        | "operations"
        | "manager"
        | "owner"
        | "trainer"
      member_type: "employee" | "coordinator" | "manager" | "owner"
      role_request_status: "pending" | "approved" | "denied"
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
      access_deny_reason: [
        "none",
        "enrollment_required",
        "payment_required",
        "org_seat_required",
        "suspended",
        "expired",
      ],
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
        "trainer",
      ],
      entitlement_status: ["active", "expired", "suspended", "revoked"],
      entitlement_type: ["trial", "paid", "org_seat", "admin_granted"],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: ["reported", "investigating", "resolved", "closed"],
      job_role: [
        "budtender",
        "security",
        "intake",
        "operations",
        "manager",
        "owner",
        "trainer",
      ],
      member_type: ["employee", "coordinator", "manager", "owner"],
      role_request_status: ["pending", "approved", "denied"],
    },
  },
} as const
