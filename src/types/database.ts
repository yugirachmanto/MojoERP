export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          timezone: string;
          approval_flow_id: string | null;
          role_order: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          timezone?: string;
          approval_flow_id?: string | null;
          role_order?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          timezone?: string;
          approval_flow_id?: string | null;
          role_order?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_approval_flow_fk";
            columns: ["approval_flow_id"];
            isOneToOne: false;
            referencedRelation: "approval_flows";
            referencedColumns: ["id"];
          }
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "manager" | "member" | "viewer";
          approval_level: number | null;
          department_id: string | null;
          status: "invited" | "active" | "removed";
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "manager" | "member" | "viewer";
          approval_level?: number | null;
          department_id?: string | null;
          status?: "invited" | "active" | "removed";
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "manager" | "member" | "viewer";
          approval_level?: number | null;
          department_id?: string | null;
          status?: "invited" | "active" | "removed";
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          owner_id: string | null;
          status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
          approval_flow_id: string | null;
          ai_monitoring_enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          owner_id?: string | null;
          status?: "planning" | "active" | "on_hold" | "completed" | "cancelled";
          approval_flow_id?: string | null;
          ai_monitoring_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          owner_id?: string | null;
          status?: "planning" | "active" | "on_hold" | "completed" | "cancelled";
          approval_flow_id?: string | null;
          ai_monitoring_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          parent_task_id: string | null;
          title: string;
          description: string | null;
          assignee_id: string | null;
          start_date: string | null;
          due_date: string | null;
          priority: "low" | "medium" | "high" | "urgent";
          status: "todo" | "in_progress" | "review" | "done" | "blocked";
          progress: number;
          estimated_hours: number | null;
          labels: string[];
          sort_order: number;
          approval_depth: number;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_task_id?: string | null;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          priority?: "low" | "medium" | "high" | "urgent";
          status?: "todo" | "in_progress" | "review" | "done" | "blocked";
          progress?: number;
          estimated_hours?: number | null;
          labels?: string[];
          sort_order?: number;
          approval_depth?: number;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          parent_task_id?: string | null;
          title?: string;
          description?: string | null;
          assignee_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          priority?: "low" | "medium" | "high" | "urgent";
          status?: "todo" | "in_progress" | "review" | "done" | "blocked";
          progress?: number;
          estimated_hours?: number | null;
          labels?: string[];
          sort_order?: number;
          approval_depth?: number;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          done: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          done?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          id: string;
          task_id: string;
          depends_on_task_id: string;
          type:
            | "finish_to_start"
            | "start_to_start"
            | "finish_to_finish"
            | "start_to_finish";
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          depends_on_task_id: string;
          type?: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          depends_on_task_id?: string;
          type?: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";
          created_at?: string;
        };
        Relationships: [];
      };
      task_activity_log: {
        Row: {
          id: number;
          task_id: string;
          actor_id: string | null;
          action: string;
          field: string | null;
          old_value: Json | null;
          new_value: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          task_id: string;
          actor_id?: string | null;
          action: string;
          field?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          task_id?: string;
          actor_id?: string | null;
          action?: string;
          field?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_rooms: {
        Row: {
          id: string;
          project_id: string;
          task_id: string | null;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          task_id?: string | null;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          task_id?: string | null;
          name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string | null;
          sender_type: "user" | "ai" | "system";
          content: string;
          reply_to_id: string | null;
          attachments: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id?: string | null;
          sender_type?: "user" | "ai" | "system";
          content: string;
          reply_to_id?: string | null;
          attachments?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string | null;
          sender_type?: "user" | "ai" | "system";
          content?: string;
          reply_to_id?: string | null;
          attachments?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      files: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string | null;
          task_id: string | null;
          message_id: string | null;
          owner_type: "project" | "task" | "message" | "esign";
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          content_hash: string | null;
          locked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id?: string | null;
          task_id?: string | null;
          message_id?: string | null;
          owner_type: "project" | "task" | "message" | "esign";
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          content_hash?: string | null;
          locked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          task_id?: string | null;
          message_id?: string | null;
          owner_type?: "project" | "task" | "message" | "esign";
          storage_path?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          content_hash?: string | null;
          locked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      approval_flows: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          is_default: boolean;
          requires_signature: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          is_default?: boolean;
          requires_signature?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          is_default?: boolean;
          requires_signature?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_steps: {
        Row: {
          id: string;
          flow_id: string;
          step_number: number;
          required_role: "project_lead" | "manager" | "director";
          required_level: number | null;
        };
        Insert: {
          id?: string;
          flow_id: string;
          step_number: number;
          required_role: "project_lead" | "manager" | "director";
          required_level?: number | null;
        };
        Update: {
          id?: string;
          flow_id?: string;
          step_number?: number;
          required_role?: "project_lead" | "manager" | "director";
          required_level?: number | null;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      task_approvals: {
        Row: {
          id: string;
          task_id: string;
          step_number: number;
          required_role: string;
          status: "pending" | "approved" | "rejected" | "skipped";
          approver_id: string | null;
          comment: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          step_number: number;
          required_role: string;
          status?: "pending" | "approved" | "rejected" | "skipped";
          approver_id?: string | null;
          comment?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          step_number?: number;
          required_role?: string;
          status?: "pending" | "approved" | "rejected" | "skipped";
          approver_id?: string | null;
          comment?: string | null;
          decided_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_settings: {
        Row: {
          id: string;
          organization_id: string;
          provider: "anthropic" | "openai";
          encrypted_api_key: string;
          key_last4: string;
          model: string;
          temperature: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: "anthropic" | "openai";
          encrypted_api_key: string;
          key_last4: string;
          model?: string;
          temperature?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: "anthropic" | "openai";
          encrypted_api_key?: string;
          key_last4?: string;
          model?: string;
          temperature?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          type:
            | "task_assigned"
            | "deadline_soon"
            | "mention"
            | "approval_pending"
            | "approval_result"
            | "ai_report"
            | "ai_reminder"
            | "system";
          title: string;
          body: string | null;
          metadata: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          type: "task_assigned" | "deadline_soon" | "mention" | "approval_pending" | "approval_result" | "ai_report" | "ai_reminder" | "system";
          title: string;
          body?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          type?: "task_assigned" | "deadline_soon" | "mention" | "approval_pending" | "approval_result" | "ai_report" | "ai_reminder" | "system";
          title?: string;
          body?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          organization_id: string | null;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          ip_address: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          organization_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          organization_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bootstrap_organization: {
        Args: {
          _name: string;
          _timezone?: string;
        };
        Returns: string;
      };
      is_org_member: {
        Args: { _org: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { _org: string; _role: string };
        Returns: boolean;
      };
      project_org: {
        Args: { _project: string };
        Returns: string;
      };
      write_audit_log: {
        Args: {
          _org: string;
          _action: string;
          _entity_type?: string | null;
          _entity_id?: string | null;
          _before?: Json | null;
          _after?: Json | null;
          _metadata?: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];