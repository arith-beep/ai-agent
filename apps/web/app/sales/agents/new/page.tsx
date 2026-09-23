import { CreateAgentForm } from "./_components/create-agent-form";

export default function NewSalesAgentPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-display text-[20px] font-semibold tracking-tight text-fg">Create Sales Agent</h1>
      <p className="mb-6 text-[13.5px] text-fg-muted">Describe what you need, or start from a blank template — you&rsquo;ll refine everything in the builder next.</p>
      <CreateAgentForm />
    </div>
  );
}
