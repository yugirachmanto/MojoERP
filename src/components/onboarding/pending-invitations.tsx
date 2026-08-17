"use client";

import { useRouter } from "next/navigation";
import { Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvitation } from "@/server/actions/org";
import { useAction } from "@/hooks/use-action";

type Invitation = {
  organization_id: string;
  organization_name: string;
  inviter_name: string | null;
  role: string;
};

export function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const { isPending, run } = useAction();

  async function handleAccept(orgId: string) {
    const result = await run(() => acceptInvitation(orgId));
    if (result.success) {
      toast.success("Undangan diterima");
      router.push(`/orgs/${orgId}/dashboard`);
      router.refresh();
    }
  }

  if (invitations.length === 0) return null;

  return (
    <Card className="w-full max-w-md border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-4 w-4" />
          Undangan Masuk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invite) => (
          <div key={invite.organization_id} className="rounded-lg border bg-background p-3">
            <p className="text-sm font-medium">{invite.organization_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Diundang oleh <span className="font-medium text-foreground">{invite.inviter_name ?? "Unknown"}</span>
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={isPending}
              onClick={() => handleAccept(invite.organization_id)}
            >
              <Check className="mr-1.5 h-4 w-4" />
              {isPending ? "Menerima..." : "Terima Undangan"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
