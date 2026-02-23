// ============================================
// ifiChat — Edge Function: Auth Callback (FIXED)
// Crée explicitement: client + widget_config + trial + telegram code
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@ifiaas.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "IFICHAT-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId, email, name, avatarUrl } = await req.json();
    console.log("Auth callback:", { userId, email, name });

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId and email required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if client already exists
    const { data: existing } = await supabase
      .from("clients")
      .select("id, is_admin")
      .eq("google_id", userId)
      .single();

    if (existing) {
      // Ensure widget_config exists
      const { data: wc } = await supabase
        .from("widget_configs")
        .select("id")
        .eq("client_id", existing.id)
        .single();

      if (!wc) {
        await supabase.from("widget_configs").insert({
          client_id: existing.id,
          business_name: name || email.split("@")[0],
        });
      }

      // Ensure trial exists
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("client_id", existing.id)
        .limit(1)
        .single();

      if (!sub && !existing.is_admin) {
        const now = new Date();
        const expires = new Date(now);
        expires.setDate(expires.getDate() + 7);
        await supabase.from("subscriptions").insert({
          client_id: existing.id,
          plan: "trial",
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expires.toISOString(),
        });
      }

      return new Response(
        JSON.stringify({
          clientId: existing.id,
          isAdmin: existing.is_admin,
          isNew: false,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Create new client
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const linkCode = generateCode();

    const { data: newClient, error } = await supabase
      .from("clients")
      .insert({
        google_id: userId,
        email,
        name: name || email.split("@")[0],
        avatar_url: avatarUrl || null,
        is_admin: isAdmin,
        telegram_link_code: linkCode,
        telegram_linked: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Client creation error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create client", details: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("Client created:", newClient.id);

    // Explicitly create widget config
    const { error: wcError } = await supabase.from("widget_configs").insert({
      client_id: newClient.id,
      business_name: name || email.split("@")[0],
    });
    if (wcError) console.error("Widget config error:", wcError);

    // Explicitly create trial subscription
    if (!isAdmin) {
      const now = new Date();
      const expires = new Date(now);
      expires.setDate(expires.getDate() + 7);

      const { error: subError } = await supabase.from("subscriptions").insert({
        client_id: newClient.id,
        plan: "trial",
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });
      if (subError) console.error("Trial error:", subError);
    }

    return new Response(
      JSON.stringify({
        clientId: newClient.id,
        isAdmin: isAdmin,
        isNew: true,
        telegramLinkCode: linkCode,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Auth callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
