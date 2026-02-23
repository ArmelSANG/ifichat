# ifiChat

**Chat en direct sur votre site, réponses depuis Telegram.**

Plateforme SaaS de chat live pour sites web. Les visiteurs écrivent via un widget, les propriétaires répondent depuis Telegram. Conçu pour l'Afrique de l'Ouest avec paiement FedaPay (Mobile Money).

---

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
- **Paiement**: FedaPay (mode live, XOF)
- **Notifications**: Telegram Bot API
- **Hébergement**: Vercel (frontend) + Supabase (backend)

## Architecture

```
ifichat-app/
├── src/
│   ├── pages/          → Landing, Login, Dashboard, Admin
│   ├── hooks/          → useAuth
│   ├── lib/            → supabase.js, constants.js
│   └── App.jsx         → Routing
├── supabase/
│   ├── schema.sql      → Tables, RLS, triggers, cron
│   └── functions/
│       ├── telegram-webhook/   → Bot Telegram
│       ├── widget-api/         → API du widget
│       ├── payments/           → FedaPay (live)
│       ├── auth-callback/      → Post-connexion Google
│       └── cron-cleanup/       → Nettoyage automatique
├── public/
│   └── w/embed.js      → Script d'intégration widget
└── vercel.json
```

## Politique de rétention

| Données       | Durée     |
|--------------|-----------|
| Messages     | **3 mois** (90 jours) |
| Fichiers/images | **1 mois** (30 jours) |
| Conversations fermées → archivage | 30 jours |

Le cron quotidien (`cron-cleanup`) gère automatiquement la suppression.

---

## Installation

### 1. Cloner et installer

```bash
git clone https://github.com/ton-user/ifichat.git
cd ifichat
npm install
```

### 2. Configurer Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** → coller le contenu de `supabase/schema.sql` → exécuter
3. Aller dans **Authentication** → **Providers** → activer **Google** (ajouter tes Client ID/Secret Google OAuth)
4. Aller dans **Storage** → vérifier que le bucket `chat-files` existe

### 3. Variables d'environnement

Copier `.env.example` en `.env.local` :

```bash
cp .env.example .env.local
```

Remplir :
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_APP_URL=https://chat.ifiaas.com
VITE_ADMIN_EMAIL=ton-email@gmail.com
VITE_FEDAPAY_PUBLIC_KEY=pk_live_...
```

### 4. Lancer en local

```bash
npm run dev
```

---

## Déploiement

### Edge Functions (Supabase)

```bash
# Installer et lier
npm install -g supabase
supabase login
supabase link --project-ref <TON_REF>

# Configurer les secrets
supabase secrets set TELEGRAM_BOT_TOKEN="ton-token"
supabase secrets set FEDAPAY_SECRET_KEY="sk_live_..."
supabase secrets set ADMIN_EMAIL="ton-email@gmail.com"
supabase secrets set APP_URL="https://chat.ifiaas.com"
supabase secrets set CRON_SECRET="un-secret-long-aleatoire"

# Déployer
npm run deploy:functions
```

### Webhook Telegram

Exécuter **une seule fois** :

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<PROJET>.supabase.co/functions/v1/telegram-webhook"}'
```

### Webhook FedaPay

> ⚠️ Tu as déjà un webhook FedaPay pour un autre projet.

L'URL du webhook ifiChat est **différente** et utilise un path unique :

```
https://<PROJET>.supabase.co/functions/v1/payments/ifichat-webhook
```

Dans [FedaPay Dashboard](https://app.fedapay.com) → Paramètres → Webhooks → **Ajouter un webhook** :
- URL : `https://<PROJET>.supabase.co/functions/v1/payments/ifichat-webhook`
- Événements : `transaction.approved`, `transaction.declined`, `transaction.cancelled`

Le handler vérifie `metadata.source === "ifichat"` pour ignorer les transactions qui ne viennent pas d'ifiChat.

### Cron Job

Dans le **SQL Editor** de Supabase :

```sql
SELECT cron.schedule(
  'ifichat-daily-cleanup',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJET>.supabase.co/functions/v1/cron-cleanup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Frontend (Vercel)

```bash
# Via Vercel CLI
npm i -g vercel
vercel --prod

# Ou connecter le repo GitHub dans le dashboard Vercel
```

Variables d'environnement Vercel :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`
- `VITE_ADMIN_EMAIL`
- `VITE_FEDAPAY_PUBLIC_KEY`

---

## Flux de fonctionnement

### Visiteur envoie un message
```
Widget → POST /widget-api/send-message → Supabase DB
  → Supabase Realtime (widget se met à jour)
  → Telegram Bot API (notification au client)
```

### Client répond depuis Telegram
```
Reply sur Telegram → POST /telegram-webhook
  → Identifie la conversation
  → Insert réponse en DB
  → Supabase Realtime (widget visiteur se met à jour)
```

### Paiement
```
Dashboard → POST /payments/create-checkout → FedaPay
  → Client paye (Mobile Money / carte)
  → FedaPay → POST /payments/ifichat-webhook
  → Active l'abonnement + notification Telegram
```

---

## Tarifs

| Plan | Prix | Durée |
|------|------|-------|
| Essai | Gratuit | 7 jours |
| Mensuel | 600 FCFA | 1 mois |
| Annuel | 6 000 FCFA | 1 an |

---

## Licence

Propriétaire — ifiAAS © 2026
