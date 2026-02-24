// ============================================
// ifiChat — Edge Function: Cron Cleanup
// /supabase/functions/cron-cleanup/index.ts
//
// Rétention:
//   - Fichiers/images: 30 jours (1 mois)
//   - Messages: 90 jours (3 mois)
//   - Conversations archivées après 30j de fermeture
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { sendEmail, addNotification, emailTemplates } from "../_shared/notifications.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function notifyTelegram(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// ─── TASK 1: Delete files older than 30 days ────────────────
async function cleanExpiredFiles() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: expiredMessages, error } = await supabase
    .from("messages")
    .select("id, file_url, file_name, content_type")
    .not("file_url", "is", null)
    .lt("created_at", thirtyDaysAgo.toISOString())
    .limit(200);

  if (error || !expiredMessages?.length) return { filesDeleted: 0 };

  let deleted = 0;

  for (const msg of expiredMessages) {
    try {
      const url = new URL(msg.file_url);
      const pathParts = url.pathname.split("/chat-files/");
      if (pathParts.length > 1) {
        const storagePath = decodeURIComponent(pathParts[1]);
        const { error: delErr } = await supabase.storage.from("chat-files").remove([storagePath]);

        if (!delErr) {
          const label = msg.content_type === "image"
            ? "[📸 Image expirée — fichiers conservés 1 mois]"
            : `[📎 Fichier expiré: ${msg.file_name || "fichier"} — fichiers conservés 1 mois]`;

          await supabase.from("messages").update({
            file_url: null,
            file_name: null,
            file_size: null,
            file_mime_type: null,
            content: label,
            content_type: "text",
          }).eq("id", msg.id);

          deleted++;
        }
      }
    } catch (e) {
      console.error(`Error deleting file for message ${msg.id}:`, e);
    }
  }

  return { filesDeleted: deleted };
}

// ─── TASK 2: Delete messages older than 90 days ─────────────
async function cleanExpiredMessages() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // First delete any remaining files on those messages
  const { data: oldMsgsWithFiles } = await supabase
    .from("messages")
    .select("file_url")
    .not("file_url", "is", null)
    .lt("created_at", ninetyDaysAgo.toISOString())
    .limit(500);

  if (oldMsgsWithFiles?.length) {
    const paths: string[] = [];
    for (const msg of oldMsgsWithFiles) {
      try {
        const url = new URL(msg.file_url);
        const pathParts = url.pathname.split("/chat-files/");
        if (pathParts.length > 1) paths.push(decodeURIComponent(pathParts[1]));
      } catch {}
    }
    if (paths.length) await supabase.storage.from("chat-files").remove(paths);
  }

  // Delete messages
  const { data, error } = await supabase
    .from("messages")
    .delete()
    .lt("created_at", ninetyDaysAgo.toISOString())
    .select("id");

  return { messagesDeleted: data?.length || 0 };
}

// ─── TASK 3: Expire subscriptions ───────────────────────────
async function expireSubscriptions() {
  const now = new Date().toISOString();

  const { data: expiredSubs } = await supabase
    .from("subscriptions")
    .select("id, client_id, plan")
    .eq("status", "active")
    .lt("expires_at", now);

  if (!expiredSubs?.length) return { subscriptionsExpired: 0 };

  // Get dynamic prices
  let monthlyPrice = 600;
  let yearlyPrice = 6000;
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "plans")
      .single();
    if (settings?.value) {
      monthlyPrice = settings.value.monthly?.price || 600;
      yearlyPrice = settings.value.yearly?.price || 6000;
    }
  } catch (e) { /* defaults */ }

  let expired = 0;

  for (const sub of expiredSubs) {
    await supabase.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);

    const { data: client } = await supabase
      .from("clients")
      .select("telegram_chat_id, telegram_linked, name, email")
      .eq("id", sub.client_id)
      .single();

    const planLabel = sub.plan === "yearly" ? "annuel" : sub.plan === "monthly" ? "mensuel" : "d'essai";

    // Dashboard
    await addNotification(
      sub.client_id, "expired",
      "⚠️ Abonnement expiré",
      `Votre plan ${planLabel} a expiré. Votre widget est désactivé. Renouvelez pour continuer.`,
      "/dashboard"
    );

    // Email
    if (client?.email) {
      const eml = emailTemplates.expired(client.name || "Client", planLabel, monthlyPrice, yearlyPrice);
      await sendEmail(client.email, eml.subject, eml.body);
    }

    // Telegram
    if (client?.telegram_linked && client?.telegram_chat_id) {
      await notifyTelegram(client.telegram_chat_id,
        `⚠️ <b>Abonnement expiré</b>\n\n` +
        `${client.name}, votre plan ${planLabel} ifiChat a expiré.\n` +
        `❌ Votre widget est désactivé.\n\n` +
        `Renouvelez maintenant :\n` +
        `📅 Mensuel: ${monthlyPrice.toLocaleString()} FCFA\n` +
        `🏆 Annuel: ${yearlyPrice.toLocaleString()} FCFA\n\n` +
        `👉 https://chat.ifiaas.com/dashboard`
      );
    }

    // Notify admin too
    try {
      const { data: admin } = await supabase
        .from("clients")
        .select("telegram_chat_id, telegram_linked")
        .eq("is_admin", true)
        .eq("telegram_linked", true)
        .limit(1)
        .single();

      if (admin?.telegram_chat_id) {
        await notifyTelegram(admin.telegram_chat_id,
          `📉 <b>Abonnement expiré</b>\n👤 ${client?.name || "Client"}\n📋 Plan: ${sub.plan}`
        );
      }
    } catch (e) { /* skip */ }

    expired++;
  }

  return { subscriptionsExpired: expired };
}

// ─── TASK 4: Subscription expiry reminders (J-3 and J-1) ────
async function sendExpiryReminders() {
  // Get dynamic prices
  let monthlyPrice = 600;
  let yearlyPrice = 6000;
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "plans")
      .single();
    if (settings?.value) {
      monthlyPrice = settings.value.monthly?.price || 600;
      yearlyPrice = settings.value.yearly?.price || 6000;
    }
  } catch (e) { /* defaults */ }

  const now = new Date();
  const threeDays = new Date(now); threeDays.setDate(threeDays.getDate() + 3);
  const twoDays = new Date(now); twoDays.setDate(twoDays.getDate() + 2);
  const oneDay = new Date(now); oneDay.setDate(oneDay.getDate() + 1);

  // J-3 reminders: expires between 2 and 3 days from now
  const { data: j3Subs } = await supabase
    .from("subscriptions")
    .select("id, client_id, plan")
    .eq("status", "active")
    .gt("expires_at", twoDays.toISOString())
    .lt("expires_at", threeDays.toISOString());

  // J-1 reminders: expires between now and 1 day from now (urgent)
  const { data: j1Subs } = await supabase
    .from("subscriptions")
    .select("id, client_id, plan")
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lt("expires_at", oneDay.toISOString());

  let sent = 0;

  // Send J-3
  for (const sub of (j3Subs || [])) {
    const { data: client } = await supabase
      .from("clients")
      .select("telegram_chat_id, telegram_linked, name, email")
      .eq("id", sub.client_id)
      .single();

    const planLabel = sub.plan === "yearly" ? "annuel" : sub.plan === "monthly" ? "mensuel" : "d'essai";

    // Dashboard
    await addNotification(
      sub.client_id, "expiry_warning",
      "⏰ Abonnement expire dans 3 jours",
      `Votre plan ${planLabel} expire bientôt. Renouvelez pour garder votre chat actif.`,
      "/dashboard"
    );

    // Email
    if (client?.email) {
      const eml = emailTemplates.expiryWarning(client.name || "Client", 3, planLabel, monthlyPrice, yearlyPrice);
      await sendEmail(client.email, eml.subject, eml.body);
    }

    // Telegram
    if (client?.telegram_linked && client?.telegram_chat_id) {
      await notifyTelegram(client.telegram_chat_id,
        `⏰ <b>Abonnement expire dans 3 jours</b>\n\n` +
        `${client.name}, votre plan ${planLabel} arrive à expiration.\n\n` +
        `Renouvelez pour garder votre chat actif :\n` +
        `📅 Mensuel: ${monthlyPrice.toLocaleString()} FCFA\n` +
        `🏆 Annuel: ${yearlyPrice.toLocaleString()} FCFA\n\n` +
        `👉 https://chat.ifiaas.com/dashboard`
      );
    }
    sent++;
  }

  // Send J-1 (urgent)
  for (const sub of (j1Subs || [])) {
    const { data: client } = await supabase
      .from("clients")
      .select("telegram_chat_id, telegram_linked, name, email")
      .eq("id", sub.client_id)
      .single();

    const planLabel = sub.plan === "yearly" ? "annuel" : sub.plan === "monthly" ? "mensuel" : "d'essai";

    // Dashboard
    await addNotification(
      sub.client_id, "expiry_warning",
      "🚨 Abonnement expire DEMAIN !",
      `Votre plan ${planLabel} expire dans moins de 24h. Votre widget sera désactivé.`,
      "/dashboard"
    );

    // Email
    if (client?.email) {
      const eml = emailTemplates.expiryWarning(client.name || "Client", 1, planLabel, monthlyPrice, yearlyPrice);
      await sendEmail(client.email, eml.subject, eml.body);
    }

    // Telegram
    if (client?.telegram_linked && client?.telegram_chat_id) {
      await notifyTelegram(client.telegram_chat_id,
        `🚨 <b>URGENT — Abonnement expire DEMAIN !</b>\n\n` +
        `${client.name}, votre plan ${planLabel} expire dans moins de 24h.\n` +
        `⚠️ Votre widget sera désactivé à l'expiration.\n\n` +
        `Renouvelez maintenant :\n` +
        `📅 Mensuel: ${monthlyPrice.toLocaleString()} FCFA\n` +
        `🏆 Annuel: ${yearlyPrice.toLocaleString()} FCFA\n\n` +
        `👉 https://chat.ifiaas.com/dashboard`
      );
    }
    sent++;
  }

  return { remindersSent: sent };
}

// ─── TASK 5: Archive old closed conversations ───────────────
async function archiveOldConversations() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("conversations")
    .update({ status: "archived" })
    .eq("status", "closed")
    .lt("last_message_at", thirtyDaysAgo.toISOString())
    .select("id");

  return { conversationsArchived: data?.length || 0 };
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (!authHeader?.includes(SUPABASE_SERVICE_KEY)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  console.log("=== ifiChat Cron Cleanup ===", new Date().toISOString());

  try {
    const [files, messages, subs, reminders, archives] = await Promise.all([
      cleanExpiredFiles(),
      cleanExpiredMessages(),
      expireSubscriptions(),
      sendExpiryReminders(),
      archiveOldConversations(),
    ]);

    const report = {
      timestamp: new Date().toISOString(),
      retention: { files: "30 days", messages: "90 days" },
      results: { ...files, ...messages, ...subs, ...reminders, ...archives },
    };

    console.log("Results:", JSON.stringify(report));
    return new Response(JSON.stringify(report), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Cron error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
