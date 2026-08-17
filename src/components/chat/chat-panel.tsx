"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/server/actions/chat";
import { cn, timeAgo } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Message = Tables<"chat_messages"> & { sender_name?: string };

export function ChatPanel({
  roomId,
  messages: initialMessages,
  currentUserId,
}: {
  roomId: string;
  messages: Message[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [lastRoomId, setLastRoomId] = useState(roomId);
  if (roomId !== lastRoomId) {
    setLastRoomId(roomId);
    setMessages(initialMessages);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      room_id: roomId,
      sender_id: currentUserId || null,
      sender_type: "user",
      content: trimmed,
      reply_to_id: null,
      attachments: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setContent("");

    const result = await sendMessage({ room_id: roomId, content: trimmed });
    setSending(false);
    if (!result.success) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Chat Project</p>
        <p className="text-xs text-muted-foreground">
          — riwayat dibaca AI agent (Fase 3)
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex gap-2.5", mine && "flex-row-reverse")}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-[10px]",
                    m.sender_type === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {m.sender_type === "ai" ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    (m.sender_name ?? "?")
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[75%]", mine && "text-right")}>
                <div
                  className={cn(
                    "inline-block rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : m.sender_type === "ai"
                        ? "border bg-muted/50"
                        : "border bg-background"
                  )}
                >
                  {m.content}
                </div>
                <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {m.sender_type === "ai"
                    ? "AI Agent"
                    : (m.sender_name ?? "User")}{" "}
                  · {timeAgo(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis pesan... (mention: @email)"
          className="min-h-10 max-h-32 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={sending || !content.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}