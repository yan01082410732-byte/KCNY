export function productionConfigurationChecks(env: Record<string, string | undefined>) {
  return {
    productionEnvironment: env.VERCEL_ENV === "production",
    productionBackend: env.NEXT_PUBLIC_SUPABASE_URL === "https://czcyarmramlpmilfhpqo.supabase.co",
    productionSite: env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") === "https://kcny.vercel.app",
    publicClientConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
  };
}
