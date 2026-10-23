import { productionConfigurationChecks } from "@/lib/release-check";

export const dynamic = "force-dynamic";

export function GET() {
  const checks = productionConfigurationChecks(process.env);
  const ok = Object.values(checks).every(Boolean);
  return Response.json({ ok, checks }, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
