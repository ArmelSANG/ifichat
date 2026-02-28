// ============================================
// ifiChat — Widget Save (uses REAL column names)
// ============================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const { clientId, config } = await req.json();
    if (!clientId || !config) {
      return new Response(JSON.stringify({ error: "clientId and config required" }), { status: 400, headers: cors });
    }

    // REAL columns from widget_configs table
    const allowed = [
      "primary_color", "secondary_color", "bg_color", "text_color",
      "header_text", "welcome_message", "offline_message",
      "logo_url", "position", "bubble_size", "show_branding",
      "auto_open_delay", "bottom_offset", "side_offset",
      "avatar_emoji", "business_hours", "away_message",
    ];

    const safe: Record<string, unknown> = {};
    for (const key of allowed) {
      if (config[key] !== undefined && config[key] !== null) {
        safe[key] = config[key];
      }
    }

    if (Object.keys(safe).length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields" }), { status: 400, headers: cors });
    }

    const { data: existing } = await supabase.from("widget_configs").select("id").eq("client_id", clientId).single();

    let error;
    if (existing) {
      const res = await supabase.from("widget_configs").update(safe).eq("client_id", clientId);
      error = res.error;
    } else {
      const res = await supabase.from("widget_configs").insert({ client_id: clientId, ...safe });
      error = res.error;
    }

    if (error) {
      return new Response(JSON.stringify({ error: "Save failed", details: error.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(e) }), { status: 500, headers: cors });
  }
});
