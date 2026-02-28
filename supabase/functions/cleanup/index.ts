// ============================================
// ifiChat — Cleanup Edge Function
// Supprime: conv fermées >6h, fichiers >30j
// Appeler via cron externe ou manuellement
// ============================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

serve(async (req) => {
  const results = { closed_deleted: 0, files_cleaned: 0, visitors_cleaned: 0, errors: [] as string[] };

  try {
    // ─── 1. Delete closed conversations older than 6 hours ───
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: closedConvs } = await supabase
      .from("conversations")
      .select("id, client_id, telegram_topic_id")
      .eq("status", "closed")
      .lt("updated_at", sixHoursAgo);

    if (closedConvs && closedConvs.length > 0) {
      for (const conv of closedConvs) {
        // Close + delete Telegram topic if exists
        if (conv.telegram_topic_id && TELEGRAM_BOT_TOKEN) {
          try {
            const { data: cl } = await supabase
              .from("clients").select("telegram_chat_id").eq("id", conv.client_id).single();
            if (cl?.telegram_chat_id) {
              // Close topic first
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/closeForumTopic`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: cl.telegram_chat_id, message_thread_id: conv.telegram_topic_id }),
              }).catch(() => {});
              // Then delete it
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteForumTopic`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: cl.telegram_chat_id, message_thread_id: conv.telegram_topic_id }),
              }).catch(() => {});
            }
          } catch (_) { /* ignore */ }
        }

        // Get file URLs to delete from storage
        const { data: fileMessages } = await supabase
          .from("messages")
          .select("file_url")
          .eq("conversation_id", conv.id)
          .not("file_url", "is", null);

        // Delete files from storage
        if (fileMessages) {
          for (const fm of fileMessages) {
            if (!fm.file_url) continue;
            const path = fm.file_url.replace(
              /.*\/storage\/v1\/object\/public\/chat-files\//,
              ""
            );
            if (path) {
              await supabase.storage.from("chat-files").remove([path]).catch(() => {});
            }
          }
        }

        // Delete messages then conversation
        await supabase.from("messages").delete().eq("conversation_id", conv.id);
        await supabase.from("conversations").delete().eq("id", conv.id);
        results.closed_deleted++;
      }
    }

    // ─── 2. Clean files older than 30 days ─────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldFiles } = await supabase
      .from("messages")
      .select("id, file_url, content_type, file_mime_type")
      .not("file_url", "is", null)
      .lt("created_at", thirtyDaysAgo)
      .limit(100); // Process in batches

    if (oldFiles && oldFiles.length > 0) {
      for (const msg of oldFiles) {
        if (!msg.file_url) continue;
        const path = msg.file_url.replace(
          /.*\/storage\/v1\/object\/public\/chat-files\//,
          ""
        );

        // Delete from storage
        if (path) {
          await supabase.storage.from("chat-files").remove([path]).catch(() => {});
        }

        // Update message
        let expiredText = "📎 Fichier expiré";
        if (msg.content_type === "image") expiredText = "📷 Image expirée";
        if (msg.file_mime_type?.startsWith("audio/")) expiredText = "🎤 Vocal expiré";

        await supabase.from("messages").update({
          file_url: null,
          file_name: null,
          file_size: null,
          file_mime_type: null,
          content: expiredText,
          content_type: "text",
        }).eq("id", msg.id);

        results.files_cleaned++;
      }
    }

    // ─── 3. Clean orphan visitors ──────────────────────────
    const { data: orphans } = await supabase.rpc("cleanup_orphan_visitors_count").catch(() => ({ data: null }));
    
    // Fallback: direct query
    const { count } = await supabase
      .from("visitors")
      .select("id", { count: "exact", head: true })
      .not("id", "in", `(SELECT visitor_id FROM conversations)`);
    // Can't do subquery in JS client — skip orphan cleanup here, use SQL function

  } catch (e) {
    results.errors.push(String(e));
  }

  return new Response(JSON.stringify({
    success: true,
    ...results,
    run_at: new Date().toISOString(),
  }), { status: 200, headers: cors });
});
