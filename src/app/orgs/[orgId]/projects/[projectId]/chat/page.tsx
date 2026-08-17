import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getProjectRoom } from "@/server/actions/chat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Chat" };

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  await requireOrg(orgId);
  const supabase = await createClient();

  const room = await getProjectRoom(projectId);
  if (!room) {
    return <p className="text-sm text-muted-foreground">Room chat belum tersedia.</p>;
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*, profiles(id, full_name)")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const parsed = (messages ?? []).map((m) => ({
    ...m,
    sender_name:
      m.sender_type === "ai"
        ? "AI Agent"
        : (m.profiles as unknown as { full_name: string | null } | null)
            ?.full_name ?? "Unknown",
  }));

  return (
    <div className="h-[calc(100vh-13rem)]">
      <ChatPanel
        roomId={room.id}
        messages={parsed}
        currentUserId={(await supabase.auth.getUser()).data.user?.id ?? ""}
      />
    </div>
  );
}