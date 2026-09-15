import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { knowledgeRepo } from "@ai-agent/storage";
import { AddDocumentForm } from "../_components/add-document-form";

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  pending: "bg-ink-faint/15 text-ink-faint",
  parsing: "bg-accent/15 text-accent",
  chunking: "bg-accent/15 text-accent",
  embedding: "bg-accent/15 text-accent",
};

export default async function KnowledgeBaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const kb = await knowledgeRepo.getKnowledgeBaseById(id);
  if (!kb || kb.orgId !== ctx.orgId) notFound();

  const documents = await knowledgeRepo.listDocuments(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{kb.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{kb.description || "No description"}</p>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Add a document</h2>
        <AddDocumentForm knowledgeBaseId={id} />
        <p className="text-xs text-ink-faint">Fetches the URL, extracts text (PDF/DOCX/HTML/plain text), chunks it, and embeds it for retrieval.</p>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Documents ({documents.length})</div>
        <div className="divide-y divide-border-subtle">
          {documents.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No documents yet.</div>}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="truncate text-ink" title={doc.sourceUri}>
                {doc.sourceUri}
              </span>
              <span className={`badge ${STATUS_STYLES[doc.status] ?? "bg-surface-raised text-ink-muted"}`}>{doc.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
