import { requireCurrentContext } from "@/lib/session";
import { credentialsRepo } from "@ai-agent/storage";
import { CredentialForm } from "./_components/credential-form";

export default async function ModelsPage() {
  const ctx = await requireCurrentContext();
  const configured = await credentialsRepo.listConfiguredProviders(ctx.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Models</h1>
        <p className="mt-1 text-sm text-ink-muted">Configure which model providers your agents can use.</p>
      </div>
      <CredentialForm configured={configured.map((c) => c.provider)} />
    </div>
  );
}
