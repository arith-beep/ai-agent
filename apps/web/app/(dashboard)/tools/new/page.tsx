import { CustomToolForm } from "../_components/custom-tool-form";

export default function NewCustomToolPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New custom tool</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Wire up any authenticated HTTP endpoint as a named tool agents and workflows can call — no code required.
        </p>
      </div>
      <CustomToolForm />
    </div>
  );
}
