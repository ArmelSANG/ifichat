// ============================================
// ifiChat — Edge Function: FedaPay Payments
// /supabase/functions/payments/index.ts
//
// MODE LIVE — Pas de sandbox
// Webhook URL unique: /payments/ifichat-webhook
// (pour cohabiter avec ton autre webhook FedaPay)
//
// - POST /create-checkout → Session de paiement
// - POST /ifichat-webhook → Webhook FedaPay dédié
// - GET /status/:clientId → Statut abonnement
// ============================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FEDAPAY_SECRET_KEY = Deno.env.get("FEDAPAY_SECRET_KEY")!; // sk_live_...
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

// FedaPay LIVE API
const FEDAPAY_BASE_URL = "https://api.fedapay.com/v1";
const APP_URL = Deno.env.get("APP_URL") || "https://chat.ifiaas.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// ─── FedaPay API call ───────────────────────────────────────
async function fedapay(endpoint: string, method: string, body?: any) {
  const res = await fetch(`${FEDAPAY_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${FEDAPAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Telegram notification ──────────────────────────────────
async function notifyTelegram(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// ─── POST /create-checkout ──────────────────────────────────
async function createCheckout(body: any) {
  const { clientId, plan } = body;

  if (!clientId || !plan || !["monthly", "yearly"].includes(plan)) {
    return new Response(JSON.stringify({ error: "clientId and plan (monthly/yearly) required" }),
      { status: 400, headers: corsHeaders });
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, email, name")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return new Response(JSON.stringify({ error: "Client not found" }),
      { status: 404, headers: corsHeaders });
  }

  const amount = plan === "monthly" ? 600 : 6000;
  const description = plan === "monthly"
    ? "ifiChat — Abonnement Mensuel"
    : "ifiChat — Abonnement Annuel";

  // Create FedaPay transaction (LIVE)
  let txResult;
  try {
    txResult = await fedapay("/transactions", "POST", {
      description,
      amount,
      currency: { iso: "XOF" },
      callback_url: `${APP_URL}/dashboard?payment=success&plan=${plan}`,
      cancel_url: `${APP_URL}/dashboard?payment=cancelled`,
      customer: {
        email: client.email,
        firstname: client.name.split(" ")[0],
        lastname: client.name.split(" ").slice(1).join(" ") || "-",
      },
      metadata: {
        client_id: clientId,
        plan,
        source: "ifichat",
      },
    });
  } catch (e) {
    console.error("FedaPay fetch error:", e);
    return new Response(JSON.stringify({ error: "FedaPay unreachable", details: String(e) }),
      { status: 500, headers: corsHeaders });
  }

  console.log("FedaPay response:", JSON.stringify(txResult));

  // Handle multiple response formats from FedaPay
  const tx = txResult?.v1?.transaction || txResult?.transaction || txResult?.data || txResult;
  const txId = tx?.id;
  
  if (!txId) {
    console.error("FedaPay transaction creation failed:", JSON.stringify(txResult));
    return new Response(JSON.stringify({ error: "Payment creation failed", details: txResult }),
      { status: 500, headers: corsHeaders });
  }

  // Generate payment token
  let tokenRes;
  try {
    tokenRes = await fedapay(`/transactions/${txId}/token`, "POST", {});
  } catch (e) {
    console.error("FedaPay token error:", e);
    return new Response(JSON.stringify({ error: "Token generation failed" }),
      { status: 500, headers: corsHeaders });
  }

  console.log("FedaPay token response:", JSON.stringify(tokenRes));

  const token = tokenRes?.token || tokenRes?.v1?.token;
  if (!token) {
    console.error("FedaPay token generation failed:", JSON.stringify(tokenRes));
    return new Response(JSON.stringify({ error: "Payment URL generation failed", details: tokenRes }),
      { status: 500, headers: corsHeaders });
  }

  // Store pending subscription
  await supabase.from("subscriptions").insert({
    client_id: clientId,
    plan,
    status: "pending",
    fedapay_transaction_id: String(txId),
    amount,
  });

  const paymentUrl = tokenRes.url || `https://process.fedapay.com/${token}`;

  return new Response(JSON.stringify({ paymentUrl, transactionId: txId }),
    { status: 200, headers: corsHeaders });
}

// ─── POST /ifichat-webhook (FedaPay webhook dédié) ──────────
async function handleWebhook(req: Request) {
  const body = await req.json();

  const event = body.entity || body;
  const status = event.status;
  const transactionId = String(event.id || event.transaction_id || "");
  const metadata = event.metadata || {};

  console.log("FedaPay webhook received:", { status, transactionId, metadata });

  // Only process ifiChat transactions
  if (metadata.source !== "ifichat") {
    console.log("Ignoring non-ifiChat transaction");
    return new Response("OK", { status: 200 });
  }

  if (status === "approved" || status === "completed") {
    const clientId = metadata.client_id;
    const plan = metadata.plan;

    if (!clientId || !plan) {
      console.error("Missing metadata");
      return new Response("OK", { status: 200 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Deactivate previous active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("client_id", clientId)
      .eq("status", "active");

    // Activate the subscription
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("fedapay_transaction_id", transactionId)
      .eq("client_id", clientId);

    if (error) {
      // Fallback: insert new record
      await supabase.from("subscriptions").insert({
        client_id: clientId,
        plan,
        status: "active",
        fedapay_transaction_id: transactionId,
        amount: plan === "monthly" ? 600 : 6000,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    }

    // Notify client on Telegram
    const { data: client } = await supabase
      .from("clients")
      .select("telegram_chat_id, telegram_linked, name")
      .eq("id", clientId)
      .single();

    if (client?.telegram_linked && client?.telegram_chat_id) {
      const label = plan === "yearly" ? "Annuel (6 000 F)" : "Mensuel (600 F)";
      await notifyTelegram(client.telegram_chat_id,
        `✅ <b>Paiement confirmé !</b>\n\n` +
        `📋 Plan: ${label}\n` +
        `📅 Expire: ${expiresAt.toLocaleDateString("fr-FR")}\n\n` +
        `Merci ${client.name} ! Votre ifiChat est actif.`
      );
    }

    console.log(`✅ Subscription activated: ${clientId}, plan: ${plan}`);
  }

  if (status === "declined" || status === "cancelled") {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("fedapay_transaction_id", transactionId);
    console.log(`❌ Transaction ${status}: ${transactionId}`);
  }

  return new Response("OK", { status: 200 });
}

// ─── GET /status/:clientId ──────────────────────────────────
async function getStatus(clientId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return new Response(JSON.stringify({ active: false, plan: null }),
      { status: 200, headers: corsHeaders });
  }

  const expired = sub.expires_at && new Date(sub.expires_at) < new Date();
  if (expired) {
    await supabase.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
    return new Response(JSON.stringify({ active: false, plan: sub.plan, expired: true }),
      { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    active: true,
    plan: sub.plan,
    expiresAt: sub.expires_at,
    startsAt: sub.starts_at,
    daysRemaining: Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000),
  }), { status: 200, headers: corsHeaders });
}

// ═══════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/payments", "");

    // POST /create-checkout
    if (req.method === "POST" && path === "/create-checkout") {
      return createCheckout(await req.json());
    }

    // POST /ifichat-webhook  ← URL unique pour cohabiter avec ton autre webhook
    if (req.method === "POST" && path === "/ifichat-webhook") {
      return handleWebhook(req);
    }

    // GET /status/:clientId
    if (req.method === "GET" && path.startsWith("/status/")) {
      return getStatus(path.replace("/status/", ""));
    }

    return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Payments error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: corsHeaders });
  }
});
