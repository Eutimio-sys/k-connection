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
      attendance: {
        Row: {
          check_in_time: string
          check_out_time: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          project_id: string | null
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
          work_date?: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_payments: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          expense_item_id: string | null
          expense_type: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_date: string
          project_id: string
          status: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expense_item_id?: string | null
          expense_type?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string
          project_id: string
          status?: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expense_item_id?: string | null
          expense_type?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string
          project_id?: string
          status?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          amount: number | null
          category_id: string
          created_at: string
          description: string
          expense_id: string
          id: string
          notes: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number | null
          category_id: string
          created_at?: string
          description: string
          expense_id: string
          id?: string
          notes?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number | null
          category_id?: string
          created_at?: string
          description?: string
          expense_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          project_id: string
          receipt_image_url: string | null
          status: string
          subtotal: number | null
          tax_invoice_number: string | null
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          project_id: string
          receipt_image_url?: string | null
          status?: string
          subtotal?: number | null
          tax_invoice_number?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          project_id?: string
          receipt_image_url?: string | null
          status?: string
          subtotal?: number | null
          tax_invoice_number?: string | null
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_expense_deductions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          labor_expense_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          labor_expense_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          labor_expense_id?: string
        }
        Relationships: []
      }
      labor_expense_items: {
        Row: {
          amount: number | null
          category_id: string
          created_at: string
          description: string
          id: string
          labor_expense_id: string
          notes: string | null
        }
        Insert: {
          amount?: number | null
          category_id: string
          created_at?: string
          description: string
          id?: string
          labor_expense_id: string
          notes?: string | null
        }
        Update: {
          amount?: number | null
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          labor_expense_id?: string
          notes?: string | null
        }
        Relationships: []
      }
      labor_expenses: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          invoice_date: string
          invoice_number: string
          net_amount: number | null
          notes: string | null
          project_id: string
          receipt_image_url: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          withholding_tax_amount: number | null
          withholding_tax_rate: number | null
          worker_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          invoice_date?: string
          invoice_number: string
          net_amount?: number | null
          notes?: string | null
          project_id: string
          receipt_image_url?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          withholding_tax_amount?: number | null
          withholding_tax_rate?: number | null
          worker_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          net_amount?: number | null
          notes?: string | null
          project_id?: string
          receipt_image_url?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          withholding_tax_amount?: number | null
          withholding_tax_rate?: number | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_expenses_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          id: string
          personal_days: number
          personal_used: number
          sick_days: number
          sick_used: number
          updated_at: string
          user_id: string
          vacation_days: number
          vacation_used: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          personal_days?: number
          personal_used?: number
          sick_days?: number
          sick_used?: number
          updated_at?: string
          user_id: string
          vacation_days?: number
          vacation_used?: number
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          personal_days?: number
          personal_used?: number
          sick_days?: number
          sick_used?: number
          updated_at?: string
          user_id?: string
          vacation_days?: number
          vacation_used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_count: number
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          notes: string | null
          reason: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count: number
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          notes?: string | null
          reason: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          notes?: string | null
          reason?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          hire_date: string | null
          id: string
          id_card: string | null
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          hire_date?: string | null
          id: string
          id_card?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          id_card?: string | null
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_approvers: {
        Row: {
          approved_at: string | null
          approver_id: string
          created_at: string
          id: string
          purchase_request_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          created_at?: string
          id?: string
          purchase_request_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          created_at?: string
          id?: string
          purchase_request_id?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category_id: string
          created_at: string
          description: string | null
          estimated_price: number
          id: string
          item_name: string
          notes: string | null
          project_id: string
          quantity: number
          requested_by: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          estimated_price: number
          id?: string
          item_name: string
          notes?: string | null
          project_id: string
          quantity: number
          requested_by: string
          status?: string
          unit: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          estimated_price?: number
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          requested_by?: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          created_at: string
          created_by: string
          effective_date: string
          id: string
          notes: string | null
          salary_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_date: string
          id?: string
          notes?: string | null
          salary_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_date?: string
          id?: string
          notes?: string | null
          salary_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          created_at: string
          daily_rate: number | null
          full_name: string
          id: string
          id_card: string | null
          is_active: boolean
          notes: string | null
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          daily_rate?: number | null
          full_name: string
          id?: string
          id_card?: string | null
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          daily_rate?: number | null
          full_name?: string
          id?: string
          id_card?: string | null
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      leave_type: "sick" | "personal" | "vacation" | "maternity" | "unpaid"
      user_role: "admin" | "manager" | "accountant" | "purchaser" | "worker"
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
      leave_type: ["sick", "personal", "vacation", "maternity", "unpaid"],
      user_role: ["admin", "manager", "accountant", "purchaser", "worker"],
    },
  },
} as const
