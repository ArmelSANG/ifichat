// ============================================
// ifiChat — Edge Function: Telegram Webhook
// /functions/telegram-webhook/index.ts
//
// Reçoit les messages du bot Telegram et les route
// vers la bonne conversation dans Supabase
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Send message to Telegram ───────────────────────────────
async function sendTelegram(chatId: number, text: string, options: any = {}) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...options,
      }),
    }
  );
  return res.json();
}

// ─── Forward file to Telegram ───────────────────────────────
async function sendTelegramFile(chatId: number, fileUrl: string, caption: string, type: string) {
  const method = type === "image" ? "sendPhoto" : "sendDocument";
  const paramKey = type === "image" ? "photo" : "document";

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        [paramKey]: fileUrl,
        caption,
        parse_mode: "HTML",
      }),
    }
  );
  return res.json();
}

// ─── Handle link code ───────────────────────────────────────
async function handleLinkCode(chatId: number, code: string) {
  // Find client with this link code
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("telegram_link_code", code.trim().toUpperCase())
    .single();

  if (error || !client) {
    await sendTelegram(chatId,
      "❌ <b>Code invalide</b>\n\nCe code de liaison n'existe pas ou a déjà été utilisé.\n\nRendez-vous sur votre dashboard ifiChat pour obtenir un nouveau code."
    );
    return;
  }

  // Link Telegram to client
  const { error: updateError } = await supabase
    .from("clients")
    .update({
      telegram_chat_id: chatId,
      telegram_linked: true,
      telegram_link_code: null, // Invalidate code after use
    })
    .eq("id", client.id);

  if (updateError) {
    await sendTelegram(chatId, "❌ Erreur lors de la liaison. Veuillez réessayer.");
    return;
  }

  await sendTelegram(chatId,
    `✅ <b>Compte lié avec succès !</b>\n\n` +
    `👤 ${client.name}\n` +
    `📧 ${client.email}\n\n` +
    `Vous recevrez désormais tous les messages de votre chat ici.\n` +
    `Répondez simplement en faisant <b>Reply</b> au message du visiteur.`
  );
}

// ─── Handle reply from client ───────────────────────────────
async function handleReply(chatId: number, replyToMessageId: number, text: string) {
  // Find the original message that was replied to
  const { data: originalMsg, error: msgError } = await supabase
    .from("messages")
    .select("id, conversation_id")
    .eq("telegram_message_id", replyToMessageId)
    .single();

  if (msgError || !originalMsg) {
    // Try to find by conversation — maybe they replied to the notification header
    const { data: notifLog } = await supabase
      .from("notifications_log")
      .select("message_id, client_id")
      .eq("telegram_message_id", replyToMessageId)
      .single();

    if (!notifLog) {
      await sendTelegram(chatId,
        "⚠️ Je n'ai pas trouvé la conversation liée à ce message.\n\n" +
        "Faites <b>Reply</b> directement sur un message de visiteur pour répondre."
      );
      return;
    }

    // Get conversation from the notification log
    const { data: msg } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("id", notifLog.message_id)
      .single();

    if (msg) {
      await insertClientReply(msg.conversation_id, text, chatId);
    }
    return;
  }

  await insertClientReply(originalMsg.conversation_id, text, chatId);
}

// ─── Insert client reply into DB ────────────────────────────
async function insertClientReply(conversationId: string, text: string, chatId: number) {
  // Verify the conversation belongs to this client
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, client_id, visitor_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) return;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("id", conversation.client_id)
    .single();

  if (!client) {
    await sendTelegram(chatId, "⚠️ Vous n'avez pas accès à cette conversation.");
    return;
  }

  // Insert the reply message
  const { data: newMsg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "client",
      content: text,
      content_type: "text",
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    await sendTelegram(chatId, "❌ Erreur lors de l'envoi. Veuillez réessayer.");
    return;
  }

  // Reset unread count for this conversation
  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  await sendTelegram(chatId, "✅ Message envoyé !");
}

// ─── Handle /start command ──────────────────────────────────
async function handleStart(chatId: number) {
  await sendTelegram(chatId,
    `🚀 <b>Bienvenue sur ifiChat !</b>\n\n` +
    `Je suis le bot qui vous permet de recevoir et répondre aux messages de chat de votre site web.\n\n` +
    `<b>Comment démarrer :</b>\n` +
    `1. Connectez-vous sur <a href="https://chat.ifiaas.com">chat.ifiaas.com</a>\n` +
    `2. Allez dans Telegram → Copier votre code\n` +
    `3. Envoyez-le moi ici\n\n` +
    `<b>Commandes :</b>\n` +
    `/start — Afficher ce message\n` +
    `/status — Vérifier l'état de votre compte\n` +
    `/help — Aide`
  );
}

// ─── Handle /status command ─────────────────────────────────
async function handleStatus(chatId: number) {
  const { data: client } = await supabase
    .from("clients")
    .select("name, email, domain, telegram_linked, created_at")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!client) {
    await sendTelegram(chatId,
      "❌ Aucun compte lié à ce Telegram.\n\nEnvoyez votre code de liaison pour connecter votre compte."
    );
    return;
  }

  // Get active subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("client_id", client.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get stats
  const { count: convCount } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id);

  const { count: msgCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id",
      (await supabase.from("conversations").select("id").eq("client_id", client.id)).data?.map((c: any) => c.id) || []
    );

  const planLabel = sub?.plan === "yearly" ? "Annuel" : sub?.plan === "monthly" ? "Mensuel" : "Essai gratuit";

  await sendTelegram(chatId,
    `📊 <b>État de votre compte ifiChat</b>\n\n` +
    `👤 ${client.name}\n` +
    `📧 ${client.email}\n` +
    `🌐 ${client.domain || "Non configuré"}\n` +
    `📋 Plan: ${planLabel}\n` +
    `${sub?.expires_at ? `📅 Expire: ${new Date(sub.expires_at).toLocaleDateString("fr-FR")}` : ""}\n\n` +
    `💬 ${convCount || 0} conversations\n` +
    `📨 ${msgCount || 0} messages\n` +
    `✅ Telegram: Connecté`
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const body = await req.json();
    const message = body.message;

    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    // Handle commands
    if (text === "/start") {
      await handleStart(chatId);
      return new Response("OK", { status: 200 });
    }

    if (text === "/status") {
      await handleStatus(chatId);
      return new Response("OK", { status: 200 });
    }

    if (text === "/help") {
      await handleStart(chatId);
      return new Response("OK", { status: 200 });
    }

    // Handle link code (format: IFICHAT-XXXXXX)
    if (text.toUpperCase().startsWith("IFICHAT-")) {
      await handleLinkCode(chatId, text);
      return new Response("OK", { status: 200 });
    }

    // Handle reply to a message (client responding to visitor)
    if (message.reply_to_message) {
      await handleReply(chatId, message.reply_to_message.message_id, text);
      return new Response("OK", { status: 200 });
    }

    // Unknown message — guide the user
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .single();

    if (client) {
      await sendTelegram(chatId,
        "💡 Pour répondre à un visiteur, faites <b>Reply</b> (répondre) directement sur le message du visiteur.\n\n" +
        "Commandes: /status /help"
      );
    } else {
      await sendTelegram(chatId,
        "👋 Envoyez votre code de liaison (ex: <b>IFICHAT-A7X9B2</b>) pour connecter votre compte.\n\n" +
        "Pas encore inscrit ? → https://chat.ifiaas.com"
      );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
});
