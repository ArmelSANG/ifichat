// ============================================
// ifiChat — Edge Function: Widget Save
// Saves widget config using service role (bypasses RLS)
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const { clientId, config } = await req.json();

    if (!clientId || !config) {
      return new Response(
        JSON.stringify({ error: "clientId and config required" }),
        { status: 400, headers: cors }
      );
    }

    // Verify client exists
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single();

    if (!client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: cors }
      );
    }

    // Allowed fields only (must exist in widget_configs table)
    const allowed = [
      "business_name", "primary_color", "welcome_message",
      "placeholder_text", "position",
      "business_hours", "bottom_offset", "side_offset",
      "logo_url", "avatar_emoji",
    ];

    const safeConfig: Record<string, unknown> = {};
    for (const key of allowed) {
      if (config[key] !== undefined) safeConfig[key] = config[key];
    }

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("widget_configs")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("widget_configs")
        .update(safeConfig)
        .eq("client_id", clientId);

      if (error) {
        console.error("Widget update error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update", details: error.message }),
          { status: 500, headers: cors }
        );
      }
    } else {
      const { error } = await supabase
        .from("widget_configs")
        .insert({ client_id: clientId, ...safeConfig });

      if (error) {
        console.error("Widget insert error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create", details: error.message }),
          { status: 500, headers: cors }
        );
      }
    }

    console.log(`[Widget] Config saved for ${clientId}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: cors }
    );
  } catch (e) {
    console.error("Widget save error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(e) }),
      { status: 500, headers: cors }
    );
  }
});
