// ============================================
// ifiChat — Shared Notification Helpers
// Uses raw SMTP over TLS to Gmail (no external lib)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Base64 encode helper ───────────────────────────────────
function b64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// ─── Send Email via Gmail SMTP (raw TLS) ────────────────────
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log("[Email] SMTP not configured, skipping");
    return false;
  }

  try {
    const fullHtml = wrapEmailTemplate(subject, htmlBody);
    const boundary = "----ifichat" + Date.now();

    const mimeMessage = [
      `From: ifiChat <${SMTP_FROM}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(subject),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(fullHtml),
      ``,
      `--${boundary}--`,
    ].join("\r\n");

    const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 });
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    async function read(): Promise<string> {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      return n ? dec.decode(buf.subarray(0, n)) : "";
    }

    async function cmd(c: string): Promise<string> {
      await conn.write(enc.encode(c + "\r\n"));
      // Small delay to ensure response is ready
      await new Promise(r => setTimeout(r, 100));
      return await read();
    }

    await read(); // server greeting
    await cmd("EHLO ifichat");
    await cmd("AUTH LOGIN");
    await cmd(btoa(SMTP_USER));
    const authRes = await cmd(btoa(SMTP_PASS));

    if (!authRes.startsWith("235")) {
      console.error("[Email] Auth failed:", authRes);
      conn.close();
      return false;
    }

    await cmd(`MAIL FROM:<${SMTP_FROM}>`);
    await cmd(`RCPT TO:<${to}>`);
    await cmd("DATA");
    const sendRes = await cmd(mimeMessage + "\r\n.");

    if (!sendRes.startsWith("250")) {
      console.error("[Email] Send failed:", sendRes);
      conn.close();
      return false;
    }

    await cmd("QUIT");
    try { conn.close(); } catch (_) {}

    console.log(`[Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (e) {
    console.error(`[Email] Failed to send to ${to}:`, e);
    return false;
  }
}

// ─── Add Dashboard Notification ─────────────────────────────
export async function addNotification(
  clientId: string,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  try {
    await supabase.from("client_notifications").insert({
      client_id: clientId,
      type,
      title,
      message,
      link: link || null,
    });
    console.log(`[Notif] Added: ${type} for ${clientId}`);
  } catch (e) {
    console.error(`[Notif] Failed:`, e);
  }
}

// ─── Email HTML Template ────────────────────────────────────
function wrapEmailTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#0D9488,#0F766E);color:#fff;font-weight:800;font-size:14px;padding:10px 18px;border-radius:12px;letter-spacing:1px;">ifiChat</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0F172A;">${title}</h2>
      <div style="color:#475569;font-size:15px;line-height:1.7;">
        ${content}
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://chat.ifiaas.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0D9488,#0F766E);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">Acceder a mon dashboard</a>
    </div>
    <div style="text-align:center;margin-top:32px;font-size:12px;color:#94a3b8;">
      ifiChat par <a href="https://ifiaas.com" style="color:#0D9488;text-decoration:none;">ifiAAS</a><br>
      <a href="https://chat.ifiaas.com" style="color:#94a3b8;text-decoration:none;">chat.ifiaas.com</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email content generators ───────────────────────────────
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Bienvenue sur ifiChat, " + name + " !",
    body: "<p>Bonjour <strong>" + name + "</strong>,</p>" +
      "<p>Votre compte ifiChat est cree ! Vous beneficiez de <strong>7 jours d'essai gratuit</strong>.</p>" +
      "<p><strong>Prochaines etapes :</strong></p>" +
      "<p>1. Personnalisez votre widget (couleurs, textes)<br>" +
      "2. Liez votre Telegram avec le bot <strong>@ifiChat_Bot</strong><br>" +
      "3. Ajoutez le code d'integration a votre site</p>" +
      "<p>Vous etes pret a recevoir vos premiers messages !</p>",
  }),

  paymentConfirmed: (name: string, plan: string, amount: number, expiresAt: string, bonusDays: number) => ({
    subject: "Paiement confirme - Plan " + plan + " active",
    body: "<p>Bonjour <strong>" + name + "</strong>,</p>" +
      "<p>Votre paiement de <strong>" + amount.toLocaleString() + " FCFA</strong> est confirme !</p>" +
      '<div style="background:#ECFDF5;border-radius:12px;padding:16px;margin:16px 0;">' +
      "<p style=\"margin:0;\"><strong>Plan :</strong> " + plan + "</p>" +
      "<p style=\"margin:4px 0 0;\"><strong>Expire le :</strong> " + expiresAt + "</p>" +
      (bonusDays > 0 ? "<p style=\"margin:4px 0 0;\"><strong>Bonus :</strong> +" + bonusDays + " jours reportes</p>" : "") +
      "</div>" +
      "<p>Votre widget de chat est actif. Merci pour votre confiance !</p>",
  }),

  expiryWarning: (name: string, daysLeft: number, plan: string, monthlyPrice: number, yearlyPrice: number) => ({
    subject: "Votre abonnement expire dans " + daysLeft + " jour" + (daysLeft > 1 ? "s" : ""),
    body: "<p>Bonjour <strong>" + name + "</strong>,</p>" +
      "<p>Votre plan <strong>" + plan + "</strong> expire dans <strong>" + daysLeft + " jour" + (daysLeft > 1 ? "s" : "") + "</strong>.</p>" +
      '<div style="background:#FEF3C7;border-radius:12px;padding:16px;margin:16px 0;">' +
      "<p style=\"margin:0;\"><strong>Mensuel :</strong> " + monthlyPrice.toLocaleString() + " FCFA</p>" +
      "<p style=\"margin:4px 0 0;\"><strong>Annuel :</strong> " + yearlyPrice.toLocaleString() + " FCFA</p>" +
      "</div>" +
      "<p>A l'expiration, votre widget sera desactive.</p>",
  }),

  expired: (name: string, plan: string, monthlyPrice: number, yearlyPrice: number) => ({
    subject: "Votre abonnement ifiChat a expire",
    body: "<p>Bonjour <strong>" + name + "</strong>,</p>" +
      "<p>Votre plan <strong>" + plan + "</strong> a expire. <strong>Votre widget est desactive.</strong></p>" +
      '<div style="background:#FEE2E2;border-radius:12px;padding:16px;margin:16px 0;">' +
      "<p style=\"margin:0;\"><strong>Mensuel :</strong> " + monthlyPrice.toLocaleString() + " FCFA</p>" +
      "<p style=\"margin:4px 0 0;\"><strong>Annuel :</strong> " + yearlyPrice.toLocaleString() + " FCFA</p>" +
      "</div>",
  }),

  telegramLinked: (name: string) => ({
    subject: "Telegram lie avec succes",
    body: "<p>Bonjour <strong>" + name + "</strong>,</p>" +
      "<p>Votre compte Telegram est maintenant connecte a ifiChat !</p>" +
      "<p>Vous recevrez desormais tous les messages de vos visiteurs directement sur Telegram.</p>" +
      "<p><strong>Commandes utiles :</strong></p>" +
      "<p>/active — Voir vos conversations actives<br>" +
      "/a1 — Historique de la conversation 1<br>" +
      "/r1 texte — Repondre a la conversation 1<br>" +
      "/status — Etat de votre compte</p>",
  }),
};
