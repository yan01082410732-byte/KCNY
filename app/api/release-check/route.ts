import { productionConfigurationChecks } from "@/lib/release-check";
import { reportsEnvironmentEnabled } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export function GET() {
  const checks = productionConfigurationChecks(process.env);
  const ok = Object.values(checks).every(Boolean);
  return Response.json({ ok, checks, reporting: { applicationEnabled: reportsEnvironmentEnabled(process.env) } }, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
