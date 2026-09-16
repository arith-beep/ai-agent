import { CreateAgentForm } from "./_components/create-agent-form";

export default function NewSalesAgentPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-ink">Create Sales Agent</h1>
      <p className="mb-6 text-sm text-ink-muted">Describe what you need, or start from a blank template — you'll refine everything in the builder next.</p>
      <CreateAgentForm />
    </div>
  );
}
