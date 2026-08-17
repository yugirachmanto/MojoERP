"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

export function useAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = <T,>(action: () => Promise<ActionResult<T>>) =>
    new Promise<ActionResult<T>>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.success) {
            setError(result.error);
            toast.error(result.error);
          } else {
            setError(null);
          }
          resolve(result);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Terjadi kesalahan";
          setError(message);
          toast.error(message);
          resolve({ success: false, error: message });
        }
      });
    });

  return { isPending, error, run };
}