"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { createDepartment, deleteDepartment } from "@/server/actions/org";

export function DepartmentsCard({
  orgId,
  departments,
}: {
  orgId: string;
  departments: { id: string; name: string }[];
}) {
  const { isPending, run } = useAction();
  const [name, setName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(() => createDepartment(orgId, { name }));
    if (result.success) {
      toast.success("Department ditambahkan");
      setName("");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    const result = await run(() => deleteDepartment(orgId, id));
    if (result.success) toast.success("Department dihapus");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="mis. Engineering, Marketing..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || !name.trim()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah
        </Button>
      </form>
      {departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada department. Tambahkan department pertama organisasi.
        </p>
      ) : (
        <ul className="space-y-2">
          {departments.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <span className="text-sm font-medium">{d.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(d.id)}
                title="Hapus department"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}