"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { updateLanguage } from "@/server/actions/user";
import { useAction } from "@/hooks/use-action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSetting() {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { isPending, run } = useAction();

  async function handleChange(value: string | null) {
    if (!value || value === lang || isPending) return;
    const next = value as Language;
    const result = await run(() => updateLanguage(value));
    if (result.success) {
      setLang(next);
      toast.success(t("settings.languageUpdated"));
      router.refresh();
    }
  }

  return (
    <Select
      value={lang}
      items={Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]))}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}