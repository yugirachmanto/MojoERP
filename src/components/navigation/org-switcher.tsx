"use client";

import Link from "next/link";
import { ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { Tables } from "@/types/database";
import type { OrgMembership } from "@/lib/auth";

type Org = Pick<Tables<"organizations">, "id" | "name" | "slug" | "logo_url">;

export function OrgSwitcher({
  orgId,
  org,
  memberships,
}: {
  orgId: string;
  org: Org;
  memberships: OrgMembership[];
}) {
  const current = org;
  const { t } = useI18n();

  return (
    <div className="border-b p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="w-full justify-between gap-2 px-2" />
          }
        >
          <span className="flex items-center gap-2 truncate">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
              {current.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-sm font-medium">{current.name}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("orgSwitcher.organizations")}</DropdownMenuLabel>
            {memberships.map((m) => {
              const id = m.organizations?.id ?? m.organization_id;
              const name = m.organizations?.name ?? t("common.unknown");
              return (
                <DropdownMenuItem
                  key={id}
                  render={
                    <Link
                      href={`/orgs/${id}/dashboard`}
                      className={id === orgId ? "font-medium" : ""}
                    />
                  }
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
