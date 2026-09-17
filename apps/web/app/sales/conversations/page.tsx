import { MessageSquare } from "lucide-react";

export default function SalesConversationsIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-sunken text-fg-faint">
        <MessageSquare size={20} />
      </div>
      <p className="text-[13.5px] font-medium text-fg">Select a conversation</p>
      <p className="max-w-xs text-[12.5px] text-fg-muted">Choose a conversation from the list to view its transcript and lead intelligence.</p>
    </div>
  );
}
