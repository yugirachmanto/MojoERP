"use client";

import { useState } from "react";
import { GripVertical, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { updateRoleOrder } from "@/server/actions/org";
import { MEMBER_ROLE_LABELS } from "@/lib/constants";

export function RoleHierarchyEditor({
  orgId,
  initialRoleOrder,
}: {
  orgId: string;
  initialRoleOrder: string[];
}) {
  const { isPending, run } = useAction();
  const [order, setOrder] = useState<string[]>(
    initialRoleOrder.length > 0
      ? initialRoleOrder
      : ["owner", "admin", "manager", "member", "viewer"]
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    if (dragIndex === 0 || targetIndex === 0) {
      toast.error("Owner harus tetap di posisi teratas");
      setDragIndex(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);

    const result = await run(() => updateRoleOrder(orgId, { role_order: next }));
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Hierarki peran diperbarui");
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {order.map((role, index) => (
          <li
            key={role}
            draggable={index !== 0}
            onDragStart={(e) => {
              if (index === 0) return;
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(index);
            }}
            className="flex cursor-default items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              {index === 0 ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {MEMBER_ROLE_LABELS[role] ?? role}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Posisi {index + 1}
            </span>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={async () => {
          const result = await run(() =>
            updateRoleOrder(orgId, { role_order: order })
          );
          if (result.success) toast.success("Hierarki peran disimpan");
          else toast.error(result.error);
        }}
      >
        Simpan hierarki
      </Button>
    </div>
  );
}