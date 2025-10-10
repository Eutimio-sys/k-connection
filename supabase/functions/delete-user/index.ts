import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the requesting user is authenticated
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if requesting user is admin
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
    
    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only admins can delete users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get user ID to delete from request body
    const { userId } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Delete all related records before deleting the user
    // This handles foreign key constraints

    // 1) Try to find a fallback admin to reassign ownership when needed
    const { data: adminCandidates, error: adminQueryError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .neq('user_id', userId)
      .limit(1)

    if (adminQueryError) {
      console.error('Error fetching admin candidates:', adminQueryError)
    }

    const fallbackAdminId = (adminCandidates && (adminCandidates as any[])[0]?.user_id) as string | undefined

    // 2) Neutralize references in accounting tables
    // expenses: allow nulls on created_by/updated_by (handled by migration); clear both
    const { error: expensesCreatedByError } = await supabaseAdmin
      .from('expenses')
      .update({ created_by: null })
      .eq('created_by', userId)
    if (expensesCreatedByError) console.error('Error updating expenses.created_by:', expensesCreatedByError)

    const { error: expensesUpdatedByError } = await supabaseAdmin
      .from('expenses')
      .update({ updated_by: null })
      .eq('updated_by', userId)
    if (expensesUpdatedByError) console.error('Error updating expenses.updated_by:', expensesUpdatedByError)

    // labor_expenses: clear created_by/updated_by
    const { error: laborCreatedByError } = await supabaseAdmin
      .from('labor_expenses')
      .update({ created_by: null })
      .eq('created_by', userId)
    if (laborCreatedByError) console.error('Error updating labor_expenses.created_by:', laborCreatedByError)

    const { error: laborUpdatedByError } = await supabaseAdmin
      .from('labor_expenses')
      .update({ updated_by: null })
      .eq('updated_by', userId)
    if (laborUpdatedByError) console.error('Error updating labor_expenses.updated_by:', laborUpdatedByError)

    // daily_payments: clear created_by and paid_by
    const { error: dpCreatedByError } = await supabaseAdmin
      .from('daily_payments')
      .update({ created_by: null })
      .eq('created_by', userId)
    if (dpCreatedByError) console.error('Error updating daily_payments.created_by:', dpCreatedByError)

    const { error: dpPaidByError } = await supabaseAdmin
      .from('daily_payments')
      .update({ paid_by: null })
      .eq('paid_by', userId)
    if (dpPaidByError) console.error('Error updating daily_payments.paid_by:', dpPaidByError)

    // project_income: reassign or delete
    if (fallbackAdminId) {
      const { error: piReassignError } = await supabaseAdmin
        .from('project_income')
        .update({ created_by: fallbackAdminId })
        .eq('created_by', userId)
      if (piReassignError) console.error('Error reassigning project_income.created_by:', piReassignError)
    } else {
      const { error: piDeleteError } = await supabaseAdmin
        .from('project_income')
        .delete()
        .eq('created_by', userId)
      if (piDeleteError) console.error('Error deleting project_income by user:', piDeleteError)
    }

    // 3) HR and requests: delete or neutralize
    const ops = [
      supabaseAdmin.from('attendance').delete().eq('user_id', userId),
      supabaseAdmin.from('document_requests').update({ processed_by: null }).eq('processed_by', userId),
      supabaseAdmin.from('document_requests').delete().eq('user_id', userId),
      supabaseAdmin.from('leave_requests').update({ approved_by: null, updated_by: null }).or(`approved_by.eq.${userId},updated_by.eq.${userId}`),
      supabaseAdmin.from('leave_requests').delete().eq('user_id', userId),
      supabaseAdmin.from('leave_balances').delete().eq('user_id', userId),
      supabaseAdmin.from('salary_records').delete().eq('user_id', userId),
      supabaseAdmin.from('notifications').delete().eq('user_id', userId),
      supabaseAdmin.from('task_assignees').delete().eq('user_id', userId),
      supabaseAdmin.from('general_chat').delete().eq('user_id', userId),
      supabaseAdmin.from('project_messages').delete().eq('user_id', userId),
      supabaseAdmin.from('purchase_request_approvers').delete().eq('approver_id', userId),
      supabaseAdmin.from('purchase_requests').update({ approved_by: null }).eq('approved_by', userId),
      supabaseAdmin.from('purchase_requests').delete().eq('requested_by', userId),
    ]

    for (const p of ops) {
      const { error } = await p
      if (error) console.error('Cleanup op error:', error)
    }

    // tasks: clear assigned_to, and reassign or delete those created by user
    const { error: tasksAssignedError } = await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: null })
      .eq('assigned_to', userId)
    if (tasksAssignedError) console.error('Error updating tasks.assigned_to:', tasksAssignedError)

    if (fallbackAdminId) {
      const { error: tasksReassignError } = await supabaseAdmin
        .from('tasks')
        .update({ created_by: fallbackAdminId })
        .eq('created_by', userId)
      if (tasksReassignError) console.error('Error reassigning tasks.created_by:', tasksReassignError)
    } else {
      const { error: tasksDeleteError } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('created_by', userId)
      if (tasksDeleteError) console.error('Error deleting tasks by user:', tasksDeleteError)
    }

    // salary_records created_by: reassign or delete
    if (fallbackAdminId) {
      const { error: srReassignError } = await supabaseAdmin
        .from('salary_records')
        .update({ created_by: fallbackAdminId })
        .eq('created_by', userId)
      if (srReassignError) console.error('Error reassigning salary_records.created_by:', srReassignError)
    } else {
      const { error: srDeleteError } = await supabaseAdmin
        .from('salary_records')
        .delete()
        .eq('created_by', userId)
      if (srDeleteError) console.error('Error deleting salary_records by user:', srDeleteError)
    }

    // 4) Remove role bindings last
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    if (rolesError) console.error('Error deleting user_roles:', rolesError)

    // 5) Finally delete user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
