const requiredServerEnvKeys = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "ADMIN_LOGIN",
  "ADMIN_PASSWORD_HASH",
  "SESSION_SECRET",
  "WHATSAPP_PHONE",
  "DELIVERY_FREE_THRESHOLD_RUB",
  "PUBLIC_SITE_URL"
] as const;

export type ServerEnvKey = (typeof requiredServerEnvKeys)[number];

export function getRequiredServerEnv(key: ServerEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Не задана переменная окружения ${key}`);
  }

  return value;
}

export function validateServerEnv(): Record<ServerEnvKey, string> {
  const missingKeys = requiredServerEnvKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Не заданы обязательные переменные окружения: ${missingKeys.join(", ")}`
    );
  }

  return Object.fromEntries(
    requiredServerEnvKeys.map((key) => [key, process.env[key] as string])
  ) as Record<ServerEnvKey, string>;
}
