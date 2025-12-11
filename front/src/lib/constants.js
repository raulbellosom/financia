export const APPWRITE_CONFIG = {
  ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  // Buckets
  RECEIPTS_BUCKET_ID: import.meta.env.VITE_APPWRITE_RECEIPTS_BUCKET_ID,
  AVATARS_BUCKET_ID: import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID,
  // Collections
  RECEIPTS_COLLECTION_ID: import.meta.env.VITE_APPWRITE_RECEIPTS_COLLECTION_ID,
  USERS_INFO_COLLECTION_ID: import.meta.env
    .VITE_APPWRITE_USERS_INFO_COLLECTION_ID,
  ACCOUNTS_COLLECTION_ID: import.meta.env.VITE_APPWRITE_ACCOUNTS_COLLECTION_ID,
  TRANSACTIONS_COLLECTION_ID: import.meta.env
    .VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID,
  CATEGORIES_COLLECTION_ID: import.meta.env
    .VITE_APPWRITE_CATEGORIES_COLLECTION_ID,
  RECURRING_RULES_COLLECTION_ID: import.meta.env
    .VITE_APPWRITE_RECURRING_RULES_COLLECTION_ID,
};

export const ACCOUNT_TYPES = {
  CASH: "cash",
  DEBIT: "debit",
  CREDIT: "credit",
  SAVINGS: "savings",
  INVESTMENT: "investment",
  WALLET: "wallet",
  OTHER: "other",
};

export const YIELD_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  ANNUAL: "annual",
};

export const YIELD_CALCULATION_BASE = {
  TOTAL: "total",
  FIXED: "fixed",
};

export const TRANSACTION_ORIGINS = {
  MANUAL: "manual",
  RECURRING: "recurring",
  OCR: "ocr",
  YIELD: "yield",
};
