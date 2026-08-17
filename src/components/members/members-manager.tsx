"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, ShieldCheck, Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAction } from "@/hooks/use-action";
import { inviteMember, removeMember, updateMemberRole } from "@/server/actions/org";
import { MEMBER_ROLES, MEMBER_ROLE_LABELS } from "@/lib/constants";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "member" | "viewer";
  status: "invited" | "active" | "removed";
  approval_level: number | null;
  department_id: string | null;
  department_name: string | null;
  name: string;
  isSelf: boolean;
};

const ASSIGNABLE_ROLES = MEMBER_ROLES.filter((r) => r.value !== "owner");
const ASSIGNABLE_ROLE_LABELS = Object.fromEntries(
  ASSIGNABLE_ROLES.map((r) => [r.value, r.label])
);

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  member: "bg-slate-100 text-slate-700",
  viewer: "bg-muted text-muted-foreground",
};

export function MembersManager({
  orgId,
  isAdmin,
  departments,
  members,
}: {
  orgId: string;
  isAdmin: boolean;
  departments: { id: string; name: string }[];
  members: Member[];
}) {
  const router = useRouter();
  const { isPending, run } = useAction();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [approvalLevel, setApprovalLevel] = useState<string>("");
  const [departmentId, setDepartmentId] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(() =>
      inviteMember(orgId, {
        email,
        role: role as never,
        approval_level: approvalLevel ? Number(approvalLevel) : null,
        department_id: departmentId || null,
      })
    );
    if (result.success) {
      const data = result.data as { emailSent?: boolean } | undefined;
      toast.success(
        data?.emailSent === false
          ? "Undangan tersimpan, tapi email belum terkirim"
          : "Undangan dikirim"
      );
      setInviteOpen(false);
      setEmail("");
      setRole("member");
      setApprovalLevel("");
      setDepartmentId("");
      router.refresh();
    }
  }

  async function handleRoleChange(
    memberId: string,
    newRole: string,
    level: string,
    deptId: string
  ) {
    const result = await run(() =>
      updateMemberRole(orgId, memberId, {
        role: newRole as never,
        approval_level: level ? Number(level) : null,
        department_id: deptId || null,
      })
    );
    if (result.success) {
      toast.success("Peran diperbarui");
      router.refresh();
    }
  }

  async function handleRemove(member: Member) {
    if (member.isSelf) {
      toast.error("Tidak bisa menghapus diri sendiri");
      return;
    }
    const result = await run(() => removeMember(orgId, member.id));
    if (result.success) {
      toast.success("Anggota dihapus");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger render={<Button disabled={!isAdmin} />}>
            <UserPlus className="mr-2 h-4 w-4" />
            Undang Anggota
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Undang Anggota</DialogTitle>
              <DialogDescription>
                Masukkan email. Kami akan kirim undangan dan pengguna bisa masuk melalui onboarding.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Peran</Label>
                  <Select
                    value={role}
                    items={ASSIGNABLE_ROLE_LABELS}
                    onValueChange={(v) => setRole(v ?? "member")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level Approval</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    placeholder="1, 2, 3..."
                    value={approvalLevel}
                    onChange={(e) => setApprovalLevel(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={departmentId}
                  items={{
                    "": "— Tanpa department —",
                    ...Object.fromEntries(departments.map((d) => [d.id, d.name])),
                  }}
                  onValueChange={(v) => setDepartmentId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Tanpa department —</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Mengundang..." : "Kirim Undangan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Level Approval</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isAdmin={isAdmin}
                departments={departments}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  isAdmin,
  departments,
  onRoleChange,
  onRemove,
}: {
  member: Member;
  isAdmin: boolean;
  departments: { id: string; name: string }[];
  onRoleChange: (id: string, role: string, level: string, deptId: string) => void;
  onRemove: (member: Member) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [level, setLevel] = useState(member.approval_level?.toString() ?? "");
  const [deptId, setDeptId] = useState(member.department_id ?? "");

  const initials = member.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const editable = isAdmin && !member.isSelf && member.role !== "owner";

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {member.name}
              {member.isSelf && (
                <span className="ml-1.5 text-xs text-muted-foreground">(kamu)</span>
              )}
            </p>
            {member.status === "invited" && (
              <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                Invited
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {editable ? (
          <Select
            value={role}
            items={ASSIGNABLE_ROLE_LABELS}
            onValueChange={(v) => setRole(v ?? "member")}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge className={ROLE_STYLES[member.role]}>
            {MEMBER_ROLE_LABELS[member.role] ?? member.role}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {editable ? (
          <Select
            value={deptId}
            items={{
              "": "—",
              ...Object.fromEntries(departments.map((d) => [d.id, d.name])),
            }}
            onValueChange={(v) => setDeptId(v ?? "")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">—</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">
            {member.department_name ?? "—"}
          </span>
        )}
      </TableCell>
      <TableCell>
        {editable ? (
          <Input
            type="number"
            min={1}
            className="w-24"
            placeholder="—"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {member.approval_level ?? "—"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {editable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRoleChange(member.id, role, level, deptId)}
              >
                Simpan
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(member)}
                title="Hapus anggota"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
          {member.role === "owner" && (
            <Crown className="h-4 w-4 text-amber-500" />
          )}
          {member.role === "admin" && (
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
