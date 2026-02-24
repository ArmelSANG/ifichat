// ============================================
// ifiChat — Edge Function: Telegram Webhook
//
// Commandes:
//   /start        — Bienvenue
//   /status       — État du compte
//   /help         — Aide
//   /active       — Liste conversations actives
//   /a1, /a2...   — Voir historique conversation N
//   /a1 fermer    — Fermer conversation N
//   /r1 texte     — Répondre à conversation N
//   IFICHAT-XXXX  — Lier le compte
//   Reply         — Répondre au visiteur
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

async function sendFile(chatId: number, fileUrl: string, caption: string, type: string) {
  const method = type === "image" ? "sendPhoto" : "sendDocument";
  const key = type === "image" ? "photo" : "document";
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, [key]: fileUrl, caption, parse_mode: "HTML" }),
    }
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

// ─── Get active conversations for client (numbered) ─────────
async function getActiveConversations(clientId: string) {
  const { data } = await supabase
    .from("conversations")
    .select("id, visitor_id, status, unread_count, last_message_at, visitors(full_name, whatsapp)")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(20);
  return data || [];
}

// ─── Get conversation by index ──────────────────────────────
async function getConversationByIndex(clientId: string, index: number) {
  const convs = await getActiveConversations(clientId);
  if (index < 1 || index > convs.length) return null;
  return convs[index - 1];
}

// ─── Format time ago ────────────────────────────────────────
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

// ═══════════════════════════════════════════════════════════
//  /start
// ═══════════════════════════════════════════════════════════
async function cmdStart(chatId: number) {
  await send(chatId,
    `🚀 <b>Bienvenue sur ifiChat !</b>\n\n` +
    `Je vous permet de recevoir et répondre aux messages de chat de votre site web.\n\n` +
    `<b>Commandes :</b>\n` +
    `/active — Conversations actives\n` +
    `/a1 — Historique conversation 1\n` +
    `/r1 texte — Répondre à conversation 1\n` +
    `/a1 fermer — Fermer conversation 1\n` +
    `/status — État du compte\n` +
    `/help — Cette aide\n\n` +
    `Ou faites <b>Reply</b> sur un message visiteur pour répondre directement.\n\n` +
    `Pas encore lié ? Envoyez votre code <b>IFICHAT-XXXXXX</b> du dashboard.`
  );
}

// ═══════════════════════════════════════════════════════════
//  /status
// ═══════════════════════════════════════════════════════════
async function cmdStatus(chatId: number) {
  const client = await getClient(chatId);
  if (!client) {
    await send(chatId, "❌ Aucun compte lié.\nEnvoyez votre code <b>IFICHAT-XXXXXX</b> pour vous connecter.");
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

  await send(chatId,
    `📊 <b>État de votre compte</b>\n\n` +
    `👤 ${client.name}\n` +
    `📧 ${client.email}\n` +
    `📋 Plan: ${planLabel}\n` +
    `${sub?.expires_at ? `📅 Expire: ${new Date(sub.expires_at).toLocaleDateString("fr-FR")}\n` : ""}` +
    `💬 ${convs.length} conversation(s) active(s)\n` +
    `✅ Telegram: Connecté`
  );
}

// ═══════════════════════════════════════════════════════════
//  /active — Liste des conversations actives
// ═══════════════════════════════════════════════════════════
async function cmdActive(chatId: number) {
  const client = await getClient(chatId);
  if (!client) {
    await send(chatId, "❌ Aucun compte lié.\nEnvoyez votre code <b>IFICHAT-XXXXXX</b>.");
    return;
  }

  const convs = await getActiveConversations(client.id);

  if (convs.length === 0) {
    await send(chatId,
      "📋 <b>Aucune conversation active</b>\n\nLes messages de vos visiteurs apparaîtront ici."
    );
    return;
  }

  let text = `📋 <b>${convs.length} conversation(s) active(s)</b>\n\n`;

  for (let i = 0; i < convs.length; i++) {
    const c = convs[i] as any;
    const name = c.visitors?.full_name || "Visiteur";
    const phone = c.visitors?.whatsapp || "";
    const unread = c.unread_count > 0 ? ` 🔴 ${c.unread_count} non lu(s)` : "";
    const ago = timeAgo(c.last_message_at);

    text += `<b>${i + 1}️⃣ ${name}</b>${phone ? ` — ${phone}` : ""}\n`;
    text += `   💬 ${ago}${unread}\n\n`;
  }

  text += `<b>Commandes :</b>\n`;
  text += `/a1 — Voir historique\n`;
  text += `/r1 bonjour — Répondre\n`;
  text += `/a1 fermer — Fermer`;

  await send(chatId, text);
}

// ═══════════════════════════════════════════════════════════
//  /a1, /a2... — Historique d'une conversation
// ═══════════════════════════════════════════════════════════
async function cmdViewConversation(chatId: number, index: number, extra: string) {
  const client = await getClient(chatId);
  if (!client) {
    await send(chatId, "❌ Aucun compte lié.");
    return;
  }

  const conv = await getConversationByIndex(client.id, index);
  if (!conv) {
    await send(chatId, `⚠️ Conversation ${index} introuvable.\nTapez /active pour voir la liste.`);
    return;
  }

  // Handle /a1 fermer
  if (extra.trim().toLowerCase() === "fermer") {
    await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", conv.id);

    const name = (conv as any).visitors?.full_name || "Visiteur";
    await send(chatId, `✅ Conversation avec <b>${name}</b> fermée.`);
    return;
  }

  // Get messages
  const { data: messages } = await supabase
    .from("messages")
    .select("sender_type, content, content_type, file_name, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const c = conv as any;
  const name = c.visitors?.full_name || "Visiteur";
  const phone = c.visitors?.whatsapp || "";

  let text = `📖 <b>Conversation avec ${name}</b>\n`;
  if (phone) text += `📱 ${phone}\n`;
  text += `\n`;

  if (!messages || messages.length === 0) {
    text += "<i>Aucun message</i>\n";
  } else {
    for (const m of messages) {
      const icon = m.sender_type === "visitor" ? "👤" : "✅";
      const sender = m.sender_type === "visitor" ? name : "Vous";
      const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      if (m.content_type === "text") {
        text += `${icon} <b>${sender}</b> [${time}]\n${m.content}\n\n`;
      } else if (m.content_type === "image") {
        text += `${icon} <b>${sender}</b> [${time}]\n📸 Photo${m.content ? ` — ${m.content}` : ""}\n\n`;
      } else {
        text += `${icon} <b>${sender}</b> [${time}]\n📎 ${m.file_name || "Fichier"}\n\n`;
      }
    }
  }

  text += `\n➡️ <b>Répondre :</b> /r${index} votre message`;

  await send(chatId, text);
}

// ═══════════════════════════════════════════════════════════
//  /r1 texte — Répondre à une conversation
// ═══════════════════════════════════════════════════════════
async function cmdReply(chatId: number, index: number, message: string) {
  const client = await getClient(chatId);
  if (!client) {
    await send(chatId, "❌ Aucun compte lié.");
    return;
  }

  if (!message.trim()) {
    await send(chatId, `⚠️ Usage: /r${index} votre message ici`);
    return;
  }

  const conv = await getConversationByIndex(client.id, index);
  if (!conv) {
    await send(chatId, `⚠️ Conversation ${index} introuvable.\nTapez /active pour voir la liste.`);
    return;
  }

  // Insert reply
  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conv.id,
      sender_type: "client",
      content: message.trim(),
      content_type: "text",
      is_read: false,
    });

  if (error) {
    console.error("Reply insert error:", error);
    await send(chatId, "❌ Erreur lors de l'envoi. Réessayez.");
    return;
  }

  // Reset unread
  await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);

  const name = (conv as any).visitors?.full_name || "Visiteur";
  await send(chatId, `✅ Message envoyé à <b>${name}</b>`);
}

// ═══════════════════════════════════════════════════════════
//  Link code handler
// ═══════════════════════════════════════════════════════════
async function handleLinkCode(chatId: number, code: string) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("telegram_link_code", code.trim().toUpperCase())
    .single();

  if (error || !client) {
    await send(chatId, "❌ <b>Code invalide</b>\n\nRendez-vous sur votre dashboard ifiChat pour obtenir votre code.");
    return;
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update({ telegram_chat_id: chatId, telegram_linked: true, telegram_link_code: null })
    .eq("id", client.id);

  if (updateError) {
    await send(chatId, "❌ Erreur lors de la liaison. Réessayez.");
    return;
  }

  await send(chatId,
    `✅ <b>Compte lié avec succès !</b>\n\n` +
    `👤 ${client.name}\n📧 ${client.email}\n\n` +
    `Vous recevrez les messages ici.\n` +
    `Tapez /active pour gérer vos conversations.\n` +
    `Ou faites <b>Reply</b> sur un message visiteur pour répondre.`
  );
}

// ═══════════════════════════════════════════════════════════
//  Reply handler (Telegram Reply)
// ═══════════════════════════════════════════════════════════
async function handleReply(chatId: number, replyToMessageId: number, text: string) {
  // Find original message
  const { data: originalMsg } = await supabase
    .from("messages")
    .select("id, conversation_id")
    .eq("telegram_message_id", replyToMessageId)
    .single();

  let conversationId: string | null = null;

  if (originalMsg) {
    conversationId = originalMsg.conversation_id;
  } else {
    // Try notification log
    const { data: notifLog } = await supabase
      .from("notifications_log")
      .select("message_id")
      .eq("telegram_message_id", replyToMessageId)
      .single();

    if (notifLog?.message_id) {
      const { data: msg } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("id", notifLog.message_id)
        .single();
      conversationId = msg?.conversation_id || null;
    }
  }

  if (!conversationId) {
    await send(chatId,
      "⚠️ Conversation non trouvée.\n\n" +
      "Utilisez /active puis /r1 pour répondre, ou faites Reply sur un message visiteur."
    );
    return;
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, client_id")
    .eq("id", conversationId)
    .single();

  if (!conv) return;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .eq("id", conv.client_id)
    .single();

  if (!client) {
    await send(chatId, "⚠️ Vous n'avez pas accès à cette conversation.");
    return;
  }

  // Insert reply
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "client",
    content: text,
    content_type: "text",
    is_read: false,
  });

  if (error) {
    await send(chatId, "❌ Erreur. Réessayez.");
    return;
  }

  await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);
  await send(chatId, "✅ Message envoyé !");
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
    const text = (message.text || "").trim();
    const textLower = text.toLowerCase();

    // ─── Commands ───────────────────────────────────
    if (textLower === "/start" || textLower === "/help") {
      await cmdStart(chatId);
      return new Response("OK", { status: 200 });
    }

    if (textLower === "/status") {
      await cmdStatus(chatId);
      return new Response("OK", { status: 200 });
    }

    if (textLower === "/active") {
      await cmdActive(chatId);
      return new Response("OK", { status: 200 });
    }

    // /a1, /a2, /a3... (with optional "fermer")
    const aMatch = textLower.match(/^\/a(\d+)\s*(.*)?$/);
    if (aMatch) {
      const index = parseInt(aMatch[1]);
      const extra = aMatch[2] || "";
      await cmdViewConversation(chatId, index, extra);
      return new Response("OK", { status: 200 });
    }

    // /r1 message, /r2 message...
    const rMatch = text.match(/^\/r(\d+)\s+(.+)$/is);
    if (rMatch) {
      const index = parseInt(rMatch[1]);
      const replyText = rMatch[2];
      await cmdReply(chatId, index, replyText);
      return new Response("OK", { status: 200 });
    }

    // /r1 without message
    const rNoMsg = textLower.match(/^\/r(\d+)$/);
    if (rNoMsg) {
      await send(chatId, `⚠️ Usage: /r${rNoMsg[1]} votre message ici`);
      return new Response("OK", { status: 200 });
    }

    // ─── Link code ──────────────────────────────────
    if (text.toUpperCase().startsWith("IFICHAT-")) {
      await handleLinkCode(chatId, text);
      return new Response("OK", { status: 200 });
    }

    // ─── Reply to message ───────────────────────────
    if (message.reply_to_message) {
      await handleReply(chatId, message.reply_to_message.message_id, text);
      return new Response("OK", { status: 200 });
    }

    // ─── Unknown ────────────────────────────────────
    const client = await getClient(chatId);
    if (client) {
      await send(chatId,
        "💡 <b>Commandes disponibles :</b>\n\n" +
        "/active — Voir vos conversations\n" +
        "/a1 — Historique conversation 1\n" +
        "/r1 texte — Répondre\n" +
        "/status — État du compte\n\n" +
        "Ou faites <b>Reply</b> sur un message visiteur."
      );
    } else {
      await send(chatId,
        "👋 Envoyez votre code <b>IFICHAT-XXXXXX</b> pour connecter votre compte.\n\n" +
        "Pas encore inscrit ? → https://chat.ifiaas.com"
      );
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});
