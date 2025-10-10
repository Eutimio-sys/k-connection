import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password, full_name, position, department, phone, id_card, role } = await req.json();

    // Validate required fields
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert profile to avoid conflicts with signup trigger
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email,
        full_name,
        position: position || null,
        department: department || null,
        phone: phone || null,
        id_card: id_card || null,
        is_active: true,
      }, { onConflict: 'id' });


    if (profileError) {
      console.error("Profile error:", profileError);
      // Try to delete the auth user if profile creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create user role (default to worker if not specified)
    const userRole = role || "worker";
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: userRole,
      });

    if (roleError) {
      console.error("Role error:", roleError);
      // Try to delete the auth user and profile if role creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      await supabaseClient.from("profiles").delete().eq("id", authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: "สร้างผู้ใช้สำเร็จ"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
