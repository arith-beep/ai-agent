import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { knowledgeRepo } from "@ai-agent/storage";
import { CreateKnowledgeBaseForm } from "./_components/create-kb-form";

export default async function KnowledgePage() {
  const ctx = await requireCurrentContext();
  const knowledgeBases = await knowledgeRepo.listKnowledgeBases(ctx.orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Knowledge</h1>
          <p className="mt-1 text-sm text-ink-muted">Reusable knowledge bases agents can retrieve from.</p>
        </div>
      </div>

      <CreateKnowledgeBaseForm />

      {knowledgeBases.length > 0 && (
        <div className="card divide-y divide-border-subtle">
          {knowledgeBases.map((kb) => (
            <Link key={kb.id} href={`/knowledge/${kb.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
              <div>
                <div className="text-sm font-medium text-ink">{kb.name}</div>
                <div className="text-xs text-ink-muted">{kb.description || "No description"}</div>
              </div>
              <span className="badge bg-surface-raised text-ink-muted">{kb.sourceType}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
