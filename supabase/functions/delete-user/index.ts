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
    
    // Set created_by to NULL in expenses
    const { error: expensesError } = await supabaseAdmin
      .from('expenses')
      .update({ created_by: null })
      .eq('created_by', userId)
    
    if (expensesError) {
      console.error('Error updating expenses:', expensesError)
    }

    // Set created_by to NULL in labor_expenses
    const { error: laborExpensesError } = await supabaseAdmin
      .from('labor_expenses')
      .update({ created_by: null })
      .eq('created_by', userId)
    
    if (laborExpensesError) {
      console.error('Error updating labor_expenses:', laborExpensesError)
    }

    // Set created_by to NULL in daily_payments
    const { error: dailyPaymentsError } = await supabaseAdmin
      .from('daily_payments')
      .update({ created_by: null })
      .eq('created_by', userId)
    
    if (dailyPaymentsError) {
      console.error('Error updating daily_payments:', dailyPaymentsError)
    }

    // Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (rolesError) {
      console.error('Error deleting user_roles:', rolesError)
    }

    // Delete user from auth.users (this will cascade delete to profiles due to foreign key)
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
