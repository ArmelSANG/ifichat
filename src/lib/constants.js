export const APP_URL = import.meta.env.VITE_APP_URL || 'https://chat.ifiaas.com';
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
export const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export const PLANS = {
  trial: { name: 'Essai gratuit', price: 0, duration: '7 jours' },
  monthly: { name: 'Mensuel', price: 600, duration: 'mois', currency: 'FCFA' },
  yearly: { name: 'Annuel', price: 6000, duration: 'an', currency: 'FCFA' },
};

// Retention policies
export const RETENTION = {
  MESSAGES_DAYS: 90,    // 3 mois
  FILES_DAYS: 30,       // 1 mois
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  file: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
  ],
};
