// ============================================
// ifiChat — Edge Function: Widget API
// /functions/widget-api/index.ts
//
// API pour le widget de chat:
// - POST /start-conversation → Crée visiteur + conversation
// - POST /send-message → Envoie un message + notifie Telegram
// - POST /upload-file → Upload fichier/image
// - GET /config/:clientId → Config du widget
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// ─── Telegram helpers ───────────────────────────────────────
async function sendTelegram(chatId: number, text: string, threadId?: number | null) {
  const payload: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (threadId) payload.message_thread_id = threadId;
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return res.json();
}

async function sendTelegramPhoto(chatId: number, photoUrl: string, caption: string, threadId?: number | null) {
  const payload: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" };
  if (threadId) payload.message_thread_id = threadId;
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return res.json();
}

async function sendTelegramDocument(chatId: number, docUrl: string, caption: string, threadId?: number | null) {
  const payload: any = { chat_id: chatId, document: docUrl, caption, parse_mode: "HTML" };
  if (threadId) payload.message_thread_id = threadId;
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  return res.json();
}

// ─── Create Telegram Forum Topic ────────────────────────────
async function createForumTopic(chatId: number, name: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createForumTopic`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          name: name.substring(0, 128), // Telegram limit
          icon_color: 0x6FB9F0, // Blue
        }),
      }
    );
    const data = await res.json();
    if (data.ok && data.result?.message_thread_id) {
      return data.result.message_thread_id;
    }
    console.error("createForumTopic failed:", data);
    return null;
  } catch (e) {
    console.error("createForumTopic error:", e);
    return null;
  }
}

// ─── Verify client subscription is active ───────────────────
async function isSubscriptionActive(clientId: string): Promise<boolean> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) return false;
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
    // Expired — update status
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("client_id", clientId)
      .eq("status", "active");
    return false;
  }
  return true;
}

// ─── GET: Widget Config ─────────────────────────────────────
async function getWidgetConfig(clientId: string) {
  const { data: config, error } = await supabase
    .from("widget_configs")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (error || !config) {
    return new Response(
      JSON.stringify({ error: "Widget not found" }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Check subscription
  const active = await isSubscriptionActive(clientId);
  if (!active) {
    return new Response(
      JSON.stringify({ error: "Subscription expired", code: "EXPIRED" }),
      { status: 403, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ config }),
    { status: 200, headers: corsHeaders }
  );
}

// ─── POST: Start Conversation ───────────────────────────────
async function startConversation(body: any, clientId: string) {
  const { fullName, whatsapp, userAgent, ipAddress } = body;

  if (!fullName || !whatsapp) {
    return new Response(
      JSON.stringify({ error: "fullName and whatsapp are required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Check subscription
  const active = await isSubscriptionActive(clientId);
  if (!active) {
    return new Response(
      JSON.stringify({ error: "Service unavailable", code: "EXPIRED" }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Check if visitor already exists with same whatsapp for this client
  let visitor;
  const { data: existingVisitor } = await supabase
    .from("visitors")
    .select("id")
    .eq("client_id", clientId)
    .eq("whatsapp", whatsapp)
    .single();

  if (existingVisitor) {
    visitor = existingVisitor;
    // Update name if changed
    await supabase
      .from("visitors")
      .update({ full_name: fullName })
      .eq("id", visitor.id);
  } else {
    // Create new visitor
    const { data: newVisitor, error: visitorError } = await supabase
      .from("visitors")
      .insert({
        client_id: clientId,
        full_name: fullName,
        whatsapp,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      })
      .select()
      .single();

    if (visitorError) {
      return new Response(
        JSON.stringify({ error: "Failed to create visitor" }),
        { status: 500, headers: corsHeaders }
      );
    }
    visitor = newVisitor;
  }

  // Check for existing active conversation
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("visitor_id", visitor.id)
    .eq("client_id", clientId)
    .eq("status", "active")
    .single();

  if (existingConv) {
    // Return existing conversation with messages
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", existingConv.id)
      .order("created_at", { ascending: true })
      .limit(100);

    return new Response(
      JSON.stringify({
        conversationId: existingConv.id,
        visitorId: visitor.id,
        messages: messages || [],
        resumed: true,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Create new conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      client_id: clientId,
      visitor_id: visitor.id,
      status: "active",
    })
    .select()
    .single();

  if (convError) {
    return new Response(
      JSON.stringify({ error: "Failed to create conversation" }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Notify client on Telegram about new conversation
  const { data: client } = await supabase
    .from("clients")
    .select("telegram_chat_id, telegram_linked, telegram_is_forum, domain")
    .eq("id", clientId)
    .single();

  if (client?.telegram_linked && client?.telegram_chat_id) {
    let topicId: number | null = null;

    // If client uses a forum group, create a topic for this visitor
    if (client.telegram_is_forum) {
      topicId = await createForumTopic(
        client.telegram_chat_id,
        `💬 ${fullName} — ${whatsapp || "visiteur"}`
      );

      if (topicId) {
        // Store topic_id in conversation
        await supabase
          .from("conversations")
          .update({ telegram_topic_id: topicId })
          .eq("id", conversation.id);
      }
    }

    await sendTelegram(
      client.telegram_chat_id,
      `🆕 <b>Nouvelle conversation</b>\n\n` +
      `👤 ${fullName}\n` +
      `📱 ${whatsapp}\n` +
      `🌐 ${client.domain || "votre site"}\n\n` +
      (client.telegram_is_forum
        ? `Répondez directement ici dans ce topic.`
        : `Le visiteur vient d'ouvrir le chat.\nFaites <b>Reply</b> ou /active pour voir.`),
      topicId
    );
  }

  return new Response(
    JSON.stringify({
      conversationId: conversation.id,
      visitorId: visitor.id,
      messages: [],
      resumed: false,
    }),
    { status: 201, headers: corsHeaders }
  );
}

// ─── POST: Send Message ─────────────────────────────────────
async function sendMessage(body: any, clientId: string) {
  const { conversationId, content, contentType = "text", fileUrl, fileName, fileSize, fileMimeType } = body;

  if (!conversationId) {
    return new Response(
      JSON.stringify({ error: "conversationId is required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Verify conversation belongs to this client
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, client_id, visitor_id")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .single();

  if (!conversation) {
    return new Response(
      JSON.stringify({ error: "Conversation not found" }),
      { status: 404, headers: corsHeaders }
    );
  }

  // Insert message
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      content: content || null,
      content_type: contentType,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      file_mime_type: fileMimeType || null,
      is_read: false,
    })
    .select()
    .single();

  if (msgError) {
    return new Response(
      JSON.stringify({ error: "Failed to send message" }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Get visitor info
  const { data: visitor } = await supabase
    .from("visitors")
    .select("full_name, whatsapp")
    .eq("id", conversation.visitor_id)
    .single();

  // Notify client on Telegram
  const { data: client } = await supabase
    .from("clients")
    .select("telegram_chat_id, telegram_linked, telegram_is_forum, domain")
    .eq("id", clientId)
    .single();

  let telegramMessageId = null;

  if (client?.telegram_linked && client?.telegram_chat_id) {
    // Get conversation's topic_id if forum mode
    let topicId: number | null = null;
    if (client.telegram_is_forum) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("telegram_topic_id")
        .eq("id", conversationId)
        .single();
      topicId = conv?.telegram_topic_id || null;

      // If no topic yet (old conversation), create one
      if (!topicId) {
        topicId = await createForumTopic(
          client.telegram_chat_id,
          `💬 ${visitor?.full_name || "Visiteur"} — ${visitor?.whatsapp || ""}`
        );
        if (topicId) {
          await supabase
            .from("conversations")
            .update({ telegram_topic_id: topicId })
            .eq("id", conversationId);
        }
      }
    }

    let tgResult;

    if (contentType === "image" && fileUrl) {
      tgResult = await sendTelegramPhoto(
        client.telegram_chat_id,
        fileUrl,
        `📸 <b>Photo de ${visitor?.full_name || "Visiteur"}</b>\n` +
        `📱 ${visitor?.whatsapp || ""}\n` +
        (client.telegram_is_forum ? "" : `\n➡️ Faites Reply pour répondre`),
        topicId
      );
    } else if (contentType === "file" && fileUrl) {
      tgResult = await sendTelegramDocument(
        client.telegram_chat_id,
        fileUrl,
        `📎 <b>Fichier de ${visitor?.full_name || "Visiteur"}</b>\n` +
        `📄 ${fileName || "fichier"}\n` +
        (client.telegram_is_forum ? "" : `\n➡️ Faites Reply pour répondre`),
        topicId
      );
    } else {
      // In forum mode, just send the content directly (no need for headers)
      const msgText = client.telegram_is_forum
        ? `${content}`
        : `💬 <b>${visitor?.full_name || "Visiteur"}</b> — ${client.domain || "votre site"}\n` +
          `📱 ${visitor?.whatsapp || ""}\n\n` +
          `${content}\n\n` +
          `➡️ Faites Reply pour répondre`;

      tgResult = await sendTelegram(client.telegram_chat_id, msgText, topicId);
    }

    telegramMessageId = tgResult?.result?.message_id || null;

    // Update message with telegram_message_id
    if (telegramMessageId) {
      await supabase
        .from("messages")
        .update({ telegram_message_id: telegramMessageId })
        .eq("id", message.id);
    }

    // Log notification
    await supabase.from("notifications_log").insert({
      client_id: clientId,
      message_id: message.id,
      telegram_sent: true,
    });
  }

  return new Response(
    JSON.stringify({ message, telegramNotified: !!telegramMessageId }),
    { status: 201, headers: corsHeaders }
  );
}

// ─── POST: Upload File ──────────────────────────────────────
async function uploadFile(req: Request, clientId: string) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response(
      JSON.stringify({ error: "No file provided" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: "File too large (max 10MB)" }),
      { status: 413, headers: corsHeaders }
    );
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("chat-files")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const { data: urlData } = supabase.storage
    .from("chat-files")
    .getPublicUrl(path);

  const isImage = file.type.startsWith("image/");

  return new Response(
    JSON.stringify({
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
      contentType: isImage ? "image" : "file",
    }),
    { status: 200, headers: corsHeaders }
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN ROUTER
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/widget-api", "");
    const clientId = req.headers.get("x-client-id") || url.searchParams.get("clientId");

    // GET /config/:clientId
    if (req.method === "GET" && path.startsWith("/config/")) {
      const cid = path.replace("/config/", "");
      return getWidgetConfig(cid);
    }

    // GET /messages/:conversationId
    if (req.method === "GET" && path.startsWith("/messages/")) {
      const convId = path.replace("/messages/", "");
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, content, sender_type, content_type, file_url, file_name, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to load messages" }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ messages: messages || [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Client ID required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // POST /start-conversation
    if (req.method === "POST" && path === "/start-conversation") {
      const body = await req.json();
      return startConversation(body, clientId);
    }

    // POST /send-message
    if (req.method === "POST" && path === "/send-message") {
      const body = await req.json();
      return sendMessage(body, clientId);
    }

    // POST /upload-file
    if (req.method === "POST" && path === "/upload-file") {
      return uploadFile(req, clientId);
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Widget API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
