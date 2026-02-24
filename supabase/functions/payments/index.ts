import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FEDAPAY_SECRET_KEY = Deno.env.get("FEDAPAY_SECRET_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const APP_URL = Deno.env.get("APP_URL") || "https://chat.ifiaas.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

// ─── FedaPay API ────────────────────────────────────────────
async function callFedaPay(endpoint: string, method: string, body?: any) {
  const url = `https://api.fedapay.com/v1${endpoint}`;
  console.log(`[FedaPay] ${method} ${url}`);
  if (body) console.log("[FedaPay] Body:", JSON.stringify(body));

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${FEDAPAY_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  console.log(`[FedaPay] Status: ${res.status}`);
  console.log(`[FedaPay] Response: ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

// Find transaction ID from any FedaPay response format
function extractTransactionId(result: any): number | null {
  // Try all known FedaPay response formats
  const paths = [
    result?.["v1/transaction"]?.id,
    result?.v1?.transaction?.id,
    result?.transaction?.id,
    result?.data?.id,
    result?.id,
  ];
  for (const val of paths) {
    if (val) return Number(val);
  }
  return null;
}

// Find token from any FedaPay token response format
function extractToken(result: any): string | null {
  const paths = [
    result?.token,
    result?.["v1/token"]?.token,
    result?.v1?.token?.token,
    result?.v1?.token,
    result?.data?.token,
  ];
  for (const val of paths) {
    if (val && typeof val === "string") return val;
  }
  return null;
}

function extractUrl(result: any): string | null {
  const paths = [
    result?.url,
    result?.["v1/token"]?.url,
    result?.v1?.token?.url,
    result?.data?.url,
  ];
  for (const val of paths) {
    if (val && typeof val === "string") return val;
  }
  return null;
}

// ─── CREATE CHECKOUT ────────────────────────────────────────
async function createCheckout(body: any) {
  const { clientId, plan } = body;

  if (!clientId || !plan || !["monthly", "yearly"].includes(plan)) {
    return reply({ error: "clientId and plan (monthly/yearly) required" }, 400);
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, email, name")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    console.error("[Checkout] Client not found:", clientId, error);
    return reply({ error: "Client not found" }, 404);
  }

  // Read dynamic prices from settings
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
  } catch (e) {
    console.log("[Checkout] Using default prices");
  }

  const amount = plan === "monthly" ? monthlyPrice : yearlyPrice;
  const description = plan === "monthly"
    ? "ifiChat - Abonnement Mensuel"
    : "ifiChat - Abonnement Annuel";

  console.log(`[Checkout] Creating transaction: ${amount} XOF for ${client.email}`);

  // Step 1: Create transaction
  const txResult = await callFedaPay("/transactions", "POST", {
    description,
    amount,
    currency: { iso: "XOF" },
    callback_url: `${APP_URL}/dashboard?payment=success&plan=${plan}`,
    cancel_url: `${APP_URL}/dashboard?payment=cancelled`,
    customer: {
      email: client.email,
      firstname: client.name.split(" ")[0] || "Client",
      lastname: client.name.split(" ").slice(1).join(" ") || "ifiChat",
    },
    metadata: {
      client_id: clientId,
      plan,
      source: "ifichat",
    },
  });

  const txId = extractTransactionId(txResult);

  if (!txId) {
    console.error("[Checkout] Failed to extract transaction ID from:", JSON.stringify(txResult));
    return reply({ error: "Payment creation failed", fedapay_response: txResult }, 500);
  }

  console.log(`[Checkout] Transaction created: ${txId}`);

  // Step 2: Get payment token
  const tokenResult = await callFedaPay(`/transactions/${txId}/token`, "POST", {});

  const token = extractToken(tokenResult);
  const paymentUrl = extractUrl(tokenResult) || (token ? `https://process.fedapay.com/${token}` : null);

  if (!paymentUrl) {
    console.error("[Checkout] Failed to extract payment URL from:", JSON.stringify(tokenResult));
    return reply({ error: "Payment URL generation failed", fedapay_response: tokenResult }, 500);
  }

  console.log(`[Checkout] Payment URL: ${paymentUrl}`);

  // Step 3: Save pending subscription
  await supabase.from("subscriptions").insert({
    client_id: clientId,
    plan,
    status: "pending",
    fedapay_transaction_id: String(txId),
    amount,
  });

  return reply({ paymentUrl, transactionId: txId });
}

// ─── WEBHOOK ────────────────────────────────────────────────
async function handleWebhook(req: Request) {
  const body = await req.json();
  console.log("[Webhook] Received:", JSON.stringify(body));

  const event = body.entity || body;
  const status = event.status;
  const transactionId = String(event.id || event.transaction_id || "");
  const metadata = event.metadata || {};

  if (metadata.source !== "ifichat") {
    console.log("[Webhook] Ignoring non-ifiChat transaction");
    return new Response("OK", { status: 200 });
  }

  if (status === "approved" || status === "completed") {
    const clientId = metadata.client_id;
    const plan = metadata.plan;

    if (!clientId || !plan) {
      console.error("[Webhook] Missing metadata");
      return new Response("OK", { status: 200 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await supabase.from("subscriptions").update({ status: "expired" })
      .eq("client_id", clientId).eq("status", "active");

    const { error } = await supabase.from("subscriptions").update({
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }).eq("fedapay_transaction_id", transactionId).eq("client_id", clientId);

    if (error) {
      await supabase.from("subscriptions").insert({
        client_id: clientId, plan, status: "active",
        fedapay_transaction_id: transactionId,
        amount: plan === "monthly" ? 600 : 6000,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    }

    const { data: client } = await supabase.from("clients")
      .select("telegram_chat_id, telegram_linked, name")
      .eq("id", clientId).single();

    if (client?.telegram_linked && client?.telegram_chat_id) {
      const label = plan === "yearly" ? "Annuel (6 000 F)" : "Mensuel (600 F)";
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: client.telegram_chat_id,
          text: `✅ <b>Paiement confirmé !</b>\n📋 Plan: ${label}\n📅 Expire: ${expiresAt.toLocaleDateString("fr-FR")}\nMerci ${client.name} !`,
          parse_mode: "HTML",
        }),
      });
    }

    console.log(`[Webhook] Subscription activated: ${clientId}, ${plan}`);
  }

  if (status === "declined" || status === "cancelled") {
    await supabase.from("subscriptions").update({ status: "cancelled" })
      .eq("fedapay_transaction_id", transactionId);
  }

  return new Response("OK", { status: 200 });
}

// ─── STATUS ─────────────────────────────────────────────────
async function getStatus(clientId: string) {
  const { data: sub } = await supabase.from("subscriptions")
    .select("*").eq("client_id", clientId).eq("status", "active")
    .order("created_at", { ascending: false }).limit(1).single();

  if (!sub) return reply({ active: false, plan: null });

  if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
    await supabase.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
    return reply({ active: false, plan: sub.plan, expired: true });
  }

  return reply({
    active: true, plan: sub.plan,
    expiresAt: sub.expires_at, startsAt: sub.starts_at,
    daysRemaining: Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000),
  });
}

// ─── ROUTER ─────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/payments", "");

    if (req.method === "POST" && path === "/create-checkout") {
      return createCheckout(await req.json());
    }
    if (req.method === "POST" && path === "/ifichat-webhook") {
      return handleWebhook(req);
    }
    if (req.method === "GET" && path.startsWith("/status/")) {
      return getStatus(path.replace("/status/", ""));
    }

    return reply({ error: "Not found" }, 404);
  } catch (error) {
    console.error("[Payments] Error:", error);
    return reply({ error: "Internal error", details: String(error) }, 500);
  }
});
