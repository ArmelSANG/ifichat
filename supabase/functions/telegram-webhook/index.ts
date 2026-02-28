// ============================================
// ifiChat — Edge Function: Telegram Webhook
//
// MODES:
//   Forum (groupe avec topics) → Chaque visiteur a son topic, le client répond directement
//   Privé (chat direct bot)    → Commandes /active, /r1, Reply, etc.
//
// Commandes (privé & forum General):
//   /start, /help    — Aide
//   /status          — État du compte
//   /active          — Conversations actives
//   /a1, /a2...      — Voir historique
//   /a1 fermer       — Fermer conversation
//   /r1 texte        — Répondre (mode privé)
//   /unlink          — Délier Telegram
//   IFICHAT-XXXX     — Lier le compte
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { sendEmail, addNotification, emailTemplates } from "../_shared/notifications.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Telegram helpers ───────────────────────────────────────
async function send(chatId: number, text: string, options: any = {}) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
    }
  );
  return res.json();
}

async function sendFile(chatId: number, fileUrl: string, caption: string, type: string, threadId?: number) {
  const method = type === "image" ? "sendPhoto" : "sendDocument";
  const key = type === "image" ? "photo" : "document";
  const payload: any = { chat_id: chatId, [key]: fileUrl, caption, parse_mode: "HTML" };
  if (threadId) payload.message_thread_id = threadId;
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return res.json();
}

// ─── Get client from chatId ─────────────────────────────────
async function getClient(chatId: number) {
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .single();
  return data;
}

// ─── Get active conversations for client ────────────────────
async function getActiveConversations(clientId: string) {
  const { data } = await supabase
    .from("conversations")
    .select("id, visitor_id, status, unread_count, last_message_at, telegram_topic_id, visitors(full_name, whatsapp)")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(20);
  return data || [];
}

async function getConversationByIndex(clientId: string, index: number) {
  const convs = await getActiveConversations(clientId);
  if (index < 1 || index > convs.length) return null;
  return convs[index - 1];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

// ═══════════════════════════════════════════════════════════
//  FORUM TOPIC: Handle message in a topic → reply to visitor
// ═══════════════════════════════════════════════════════════
async function handleTopicMessage(chatId: number, threadId: number, text: string) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, client_id, visitor_id, status")
    .eq("telegram_topic_id", threadId)
    .single();

  if (!conv) return; // Unknown topic

  const client = await getClient(chatId);
  if (!client || client.id !== conv.client_id) return;

  if (conv.status === "closed") {
    await supabase.from("conversations").update({ status: "active" }).eq("id", conv.id);
    await send(chatId, "🔄 Conversation rouverte.", { message_thread_id: threadId });
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_type: "client",
    content: text,
    content_type: "text",
    is_read: false,
  });

  if (error) {
    console.error("Topic reply error:", error);
    await send(chatId, "❌ Erreur d'envoi.", { message_thread_id: threadId });
    return;
  }

  await supabase.from("conversations").update({
    unread_count: 0,
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
}

// ═══════════════════════════════════════════════════════════
//  FORUM: Handle /fermer in topic
// ═══════════════════════════════════════════════════════════
async function handleTopicClose(chatId: number, threadId: number) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, visitors(full_name)")
    .eq("telegram_topic_id", threadId)
    .single();

  if (!conv) return;

  await supabase.from("conversations").update({ status: "closed" }).eq("id", conv.id);

  const name = (conv as any).visitors?.full_name || "Visiteur";
  await send(chatId, `✅ Conversation avec <b>${name}</b> fermée.`, { message_thread_id: threadId });

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/closeForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_thread_id: threadId }),
    });
  } catch (e) { /* non-critical */ }
}

// ═══════════════════════════════════════════════════════════
//  Commands
// ═══════════════════════════════════════════════════════════
async function cmdStart(chatId: number, threadId?: number) {
  const opts: any = {};
  if (threadId) opts.message_thread_id = threadId;

  await send(chatId,
    `🚀 <b>Bienvenue sur ifiChat !</b>\n\n` +
    `Recevez et répondez aux messages de chat de votre site.\n\n` +
    `<b>Mode Forum :</b> Chaque visiteur a son topic. Répondez directement dedans.\n\n` +
    `<b>Commandes :</b>\n` +
    `/active — Conversations actives\n` +
    `/status — État du compte\n` +
    `/unlink — Délier Telegram\n` +
    `/help — Cette aide\n\n` +
    `Pas encore lié ? Envoyez votre code <b>IFICHAT-XXXXXX</b>.`,
    opts
  );
}

async function cmdStatus(chatId: number, threadId?: number) {
  const client = await getClient(chatId);
  const opts: any = {};
  if (threadId) opts.message_thread_id = threadId;

  if (!client) {
    await send(chatId, "❌ Aucun compte lié.\nEnvoyez votre code <b>IFICHAT-XXXXXX</b>.", opts);
    return;
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("client_id", client.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const convs = await getActiveConversations(client.id);
  const planLabel = sub?.plan === "yearly" ? "Annuel" : sub?.plan === "monthly" ? "Mensuel" : "Essai gratuit";
  const mode = client.telegram_is_forum ? "Forum (groupe)" : "Privé (chat direct)";

  await send(chatId,
    `📊 <b>État de votre compte</b>\n\n` +
    `👤 ${client.name}\n📧 ${client.email}\n` +
    `📋 Plan: ${planLabel}\n` +
    `${sub?.expires_at ? `📅 Expire: ${new Date(sub.expires_at).toLocaleDateString("fr-FR")}\n` : ""}` +
    `💬 ${convs.length} conversation(s) active(s)\n` +
    `📡 Mode: ${mode}\n✅ Telegram: Connecté`,
    opts
  );
}

async function cmdActive(chatId: number, threadId?: number) {
  const client = await getClient(chatId);
  const opts: any = {};
  if (threadId) opts.message_thread_id = threadId;

  if (!client) {
    await send(chatId, "❌ Aucun compte lié.", opts);
    return;
  }

  const convs = await getActiveConversations(client.id);

  if (convs.length === 0) {
    await send(chatId, "📋 <b>Aucune conversation active</b>\n\nLes messages apparaîtront ici.", opts);
    return;
  }

  let text = `📋 <b>${convs.length} conversation(s) active(s)</b>\n\n`;

  for (let i = 0; i < convs.length; i++) {
    const c = convs[i] as any;
    const name = c.visitors?.full_name || "Visiteur";
    const phone = c.visitors?.whatsapp || "";
    const unread = c.unread_count > 0 ? ` 🔴 ${c.unread_count}` : "";
    const ago = timeAgo(c.last_message_at);
    text += `<b>${i + 1}️⃣ ${name}</b>${phone ? ` — ${phone}` : ""}\n   💬 ${ago}${unread}\n\n`;
  }

  if (client.telegram_is_forum) {
    text += `💡 Ouvrez le topic du visiteur pour répondre.`;
  } else {
    text += `/a1 — Historique  •  /r1 texte — Répondre  •  /a1 fermer — Fermer`;
  }

  await send(chatId, text, opts);
}

async function cmdViewConversation(chatId: number, index: number, extra: string) {
  const client = await getClient(chatId);
  if (!client) { await send(chatId, "❌ Aucun compte lié."); return; }

  const conv = await getConversationByIndex(client.id, index);
  if (!conv) { await send(chatId, `⚠️ Conversation ${index} introuvable.\n/active`); return; }

  if (extra.trim().toLowerCase() === "fermer") {
    await supabase.from("conversations").update({ status: "closed" }).eq("id", conv.id);
    await send(chatId, `✅ Conversation avec <b>${(conv as any).visitors?.full_name || "Visiteur"}</b> fermée.`);
    return;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("sender_type, content, content_type, file_name, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const c = conv as any;
  const name = c.visitors?.full_name || "Visiteur";
  let text = `📖 <b>${name}</b>${c.visitors?.whatsapp ? ` — ${c.visitors.whatsapp}` : ""}\n\n`;

  if (!messages?.length) {
    text += "<i>Aucun message</i>\n";
  } else {
    for (const m of messages) {
      const icon = m.sender_type === "visitor" ? "👤" : "✅";
      const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      text += m.content_type === "text"
        ? `${icon} [${time}] ${m.content}\n`
        : `${icon} [${time}] 📎 ${m.file_name || "Fichier"}\n`;
    }
  }

  text += `\n➡️ /r${index} votre message`;
  await send(chatId, text);
}

async function cmdReply(chatId: number, index: number, message: string) {
  const client = await getClient(chatId);
  if (!client) { await send(chatId, "❌ Aucun compte lié."); return; }
  if (!message.trim()) { await send(chatId, `⚠️ /r${index} votre message`); return; }

  const conv = await getConversationByIndex(client.id, index);
  if (!conv) { await send(chatId, `⚠️ Conversation ${index} introuvable.\n/active`); return; }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conv.id, sender_type: "client", content: message.trim(), content_type: "text", is_read: false,
  });

  if (error) { await send(chatId, "❌ Erreur. Réessayez."); return; }

  await supabase.from("conversations").update({
    unread_count: 0,
    last_message_at: new Date().toISOString(),
  }).eq("id", conv.id);
  await send(chatId, `✅ Envoyé à <b>${(conv as any).visitors?.full_name || "Visiteur"}</b>`);
}

// ═══════════════════════════════════════════════════════════
//  Link code — detects group vs private
// ═══════════════════════════════════════════════════════════
async function handleLinkCode(chatId: number, code: string, chatType: string) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("telegram_link_code", code.trim().toUpperCase())
    .single();

  if (error || !client) {
    await send(chatId, "❌ <b>Code invalide</b>\n\nAllez sur votre dashboard ifiChat pour le code.");
    return;
  }

  const isForum = chatType === "supergroup";

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      telegram_chat_id: chatId, telegram_linked: true,
      telegram_link_code: null, telegram_is_forum: isForum,
    })
    .eq("id", client.id);

  if (updateError) { await send(chatId, "❌ Erreur. Réessayez."); return; }

  const modeText = isForum
    ? `📡 <b>Mode Forum activé !</b>\nChaque visiteur aura son propre topic.\nRépondez directement dans le topic.`
    : `📡 <b>Mode privé</b>\nUtilisez /active, /r1 ou Reply pour répondre.`;

  await send(chatId,
    `✅ <b>Compte lié !</b>\n\n👤 ${client.name}\n📧 ${client.email}\n\n${modeText}\n\n` +
    `/active — Conversations  •  /status — État  •  /unlink — Délier`
  );

  await addNotification(client.id, "telegram_linked",
    isForum ? "Telegram Forum connecté ✅" : "Telegram connecté ✅",
    isForum ? "Mode Forum activé. Chaque visiteur aura son propre topic." : "Bot Telegram lié en mode privé.",
    "/dashboard"
  );

  const tgEmail = emailTemplates.telegramLinked(client.name);
  await sendEmail(client.email, tgEmail.subject, tgEmail.body);

  try {
    const { data: admin } = await supabase
      .from("clients").select("telegram_chat_id, telegram_linked")
      .eq("is_admin", true).eq("telegram_linked", true).neq("id", client.id).limit(1).single();

    if (admin?.telegram_chat_id) {
      await send(admin.telegram_chat_id,
        `🔗 <b>Nouveau Telegram lié</b>\n👤 ${client.name}\n📡 ${isForum ? "Forum" : "Privé"}`
      );
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
//  Reply handler (private chat)
// ═══════════════════════════════════════════════════════════
async function handleReply(chatId: number, replyToMessageId: number, text: string) {
  const { data: originalMsg } = await supabase
    .from("messages").select("id, conversation_id")
    .eq("telegram_message_id", replyToMessageId).single();

  let conversationId: string | null = originalMsg?.conversation_id || null;

  if (!conversationId) {
    const { data: notifLog } = await supabase
      .from("notifications_log").select("message_id")
      .eq("telegram_message_id", replyToMessageId).single();

    if (notifLog?.message_id) {
      const { data: msg } = await supabase
        .from("messages").select("conversation_id").eq("id", notifLog.message_id).single();
      conversationId = msg?.conversation_id || null;
    }
  }

  if (!conversationId) {
    await send(chatId, "⚠️ Conversation non trouvée.\n/active puis /r1 pour répondre.");
    return;
  }

  const { data: conv } = await supabase.from("conversations").select("id, client_id").eq("id", conversationId).single();
  if (!conv) return;

  const { data: client } = await supabase.from("clients").select("id")
    .eq("telegram_chat_id", chatId).eq("id", conv.client_id).single();

  if (!client) { await send(chatId, "⚠️ Pas accès à cette conversation."); return; }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId, sender_type: "client", content: text, content_type: "text", is_read: false,
  });

  if (error) { await send(chatId, "❌ Erreur."); return; }

  await supabase.from("conversations").update({
    unread_count: 0,
    last_message_at: new Date().toISOString(),
  }).eq("id", conversationId);
  await send(chatId, "✅ Envoyé !");
}

// ═══════════════════════════════════════════════════════════
//  Unlink
// ═══════════════════════════════════════════════════════════
async function cmdUnlink(chatId: number, threadId?: number) {
  const client = await getClient(chatId);
  const opts: any = {};
  if (threadId) opts.message_thread_id = threadId;

  if (!client) { await send(chatId, "❌ Aucun compte lié.", opts); return; }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let newCode = "IFICHAT-";
  for (let i = 0; i < 6; i++) newCode += chars.charAt(Math.floor(Math.random() * chars.length));

  await supabase.from("clients").update({
    telegram_linked: false, telegram_chat_id: null,
    telegram_link_code: newCode, telegram_is_forum: false,
  }).eq("id", client.id);

  await send(chatId,
    `🔓 <b>Compte délié</b>\n\n${client.name}, Telegram déconnecté.\nNouveau code dans le dashboard.`,
    opts
  );

  await addNotification(client.id, "telegram_unlinked",
    "Telegram déconnecté", "Bot délié. Reconnectez depuis l'onglet Telegram.", "/dashboard"
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN ROUTER
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("OK", { status: 200 });

    const body = await req.json();
    const message = body.message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const text = (message.text || "").trim();
    const textLower = text.toLowerCase();
    const threadId = message.message_thread_id || null;
    const isTopicMessage = message.is_topic_message || false;

    // ─── FORUM: message in a visitor topic ──────────
    if (chatType === "supergroup" && isTopicMessage && threadId) {
      if (textLower === "/fermer" || textLower === "/close") {
        await handleTopicClose(chatId, threadId);
        return new Response("OK", { status: 200 });
      }

      // Commands in topics
      if (textLower === "/start" || textLower === "/help") { await cmdStart(chatId, threadId); return new Response("OK"); }
      if (textLower === "/status") { await cmdStatus(chatId, threadId); return new Response("OK"); }
      if (textLower === "/active") { await cmdActive(chatId, threadId); return new Response("OK"); }
      if (textLower === "/unlink") { await cmdUnlink(chatId, threadId); return new Response("OK"); }

      if (text.toUpperCase().startsWith("IFICHAT-")) {
        await handleLinkCode(chatId, text, chatType);
        return new Response("OK");
      }

      // Regular text → reply to visitor in this topic
      if (text && !text.startsWith("/")) {
        await handleTopicMessage(chatId, threadId, text);
      }
      return new Response("OK", { status: 200 });
    }

    // ─── SUPERGROUP General (no topic) ──────────────
    if (chatType === "supergroup" || chatType === "group") {
      if (textLower === "/start" || textLower === "/help") { await cmdStart(chatId); return new Response("OK"); }
      if (textLower === "/status") { await cmdStatus(chatId); return new Response("OK"); }
      if (textLower === "/active") { await cmdActive(chatId); return new Response("OK"); }
      if (textLower === "/unlink") { await cmdUnlink(chatId); return new Response("OK"); }

      if (text.toUpperCase().startsWith("IFICHAT-")) {
        await handleLinkCode(chatId, text, chatType);
        return new Response("OK");
      }

      const aMatch = textLower.match(/^\/a(\d+)\s*(.*)?$/);
      if (aMatch) { await cmdViewConversation(chatId, parseInt(aMatch[1]), aMatch[2] || ""); return new Response("OK"); }

      const rMatch = text.match(/^\/r(\d+)\s+(.+)$/is);
      if (rMatch) { await cmdReply(chatId, parseInt(rMatch[1]), rMatch[2]); return new Response("OK"); }

      return new Response("OK", { status: 200 });
    }

    // ─── PRIVATE CHAT ───────────────────────────────
    if (textLower === "/start" || textLower === "/help") { await cmdStart(chatId); return new Response("OK"); }
    if (textLower === "/status") { await cmdStatus(chatId); return new Response("OK"); }
    if (textLower === "/active") { await cmdActive(chatId); return new Response("OK"); }
    if (textLower === "/unlink") { await cmdUnlink(chatId); return new Response("OK"); }

    const aMatch = textLower.match(/^\/a(\d+)\s*(.*)?$/);
    if (aMatch) { await cmdViewConversation(chatId, parseInt(aMatch[1]), aMatch[2] || ""); return new Response("OK"); }

    const rMatch = text.match(/^\/r(\d+)\s+(.+)$/is);
    if (rMatch) { await cmdReply(chatId, parseInt(rMatch[1]), rMatch[2]); return new Response("OK"); }

    const rNoMsg = textLower.match(/^\/r(\d+)$/);
    if (rNoMsg) { await send(chatId, `⚠️ /r${rNoMsg[1]} votre message`); return new Response("OK"); }

    if (text.toUpperCase().startsWith("IFICHAT-")) {
      await handleLinkCode(chatId, text, chatType);
      return new Response("OK");
    }

    if (message.reply_to_message) {
      await handleReply(chatId, message.reply_to_message.message_id, text);
      return new Response("OK");
    }

    // Unknown
    const client = await getClient(chatId);
    if (client) {
      await send(chatId, "💡 /active — Conversations  •  /r1 texte — Répondre  •  /status — État\nOu <b>Reply</b> sur un message.");
    } else {
      await send(chatId, "👋 Envoyez <b>IFICHAT-XXXXXX</b> pour connecter.\nhttps://chat.ifiaas.com");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});
