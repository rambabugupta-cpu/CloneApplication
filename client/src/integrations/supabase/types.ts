export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      communications: {
        Row: {
          external_id: string | null
          id: number
          message: string
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string
          user_id: number | null
        }
        Insert: {
          external_id?: string | null
          id?: number
          message: string
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type: string
          user_id?: number | null
        }
        Update: {
          external_id?: string | null
          id?: number
          message?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      excel_data: {
        Row: {
          created_at: string | null
          file_id: number | null
          id: number
          row_data: Json
        }
        Insert: {
          created_at?: string | null
          file_id?: number | null
          id?: number
          row_data: Json
        }
        Update: {
          created_at?: string | null
          file_id?: number | null
          id?: number
          row_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "excel_data_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: number
          order_id: string
          payment_id: string | null
          plan_id: string | null
          status: string | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: number
          order_id: string
          payment_id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: number
          order_id?: string
          payment_id?: string | null
          plan_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          mobile: string | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          mobile?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          mobile?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          file_size: number
          filename: string
          id: number
          mime_type: string
          original_name: string
          status: string | null
          upload_date: string | null
          user_id: number | null
        }
        Insert: {
          file_size: number
          filename: string
          id?: number
          mime_type: string
          original_name: string
          status?: string | null
          upload_date?: string | null
          user_id?: number | null
        }
        Update: {
          file_size?: number
          filename?: string
          id?: number
          mime_type?: string
          original_name?: string
          status?: string | null
          upload_date?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          name: string
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_user_approved: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "customer"
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
      app_role: ["admin", "employee", "customer"],
    },
  },
} as const
