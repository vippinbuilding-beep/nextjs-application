"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  CREATOR_PROFILE_TAB_OPTIONS,
  type CreatorProfileTab,
} from "@/lib/creator-profile-tabs";
import { cn } from "@/lib/utils";
import { userRepository } from "@/services/repository-factory";

interface ProfileDefaultTabPickerProps {
  userId: string;
  value: CreatorProfileTab | null | undefined;
  availableTabs: CreatorProfileTab[];
  onSaved?: (tab: CreatorProfileTab) => void;
}

export function ProfileDefaultTabPicker({
  userId,
  value,
  availableTabs,
  onSaved,
}: ProfileDefaultTabPickerProps) {
  const [selected, setSelected] = useState<CreatorProfileTab | null>(
    value && availableTabs.includes(value) ? value : availableTabs[0] ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabsKey = availableTabs.join(",");

  useEffect(() => {
    const tabs = tabsKey ? (tabsKey.split(",") as CreatorProfileTab[]) : [];
    const next =
      value && tabs.includes(value) ? value : tabs[0] ?? null;
    setSelected(next);
  }, [value, tabsKey]);

  if (availableTabs.length <= 1) {
    return (
      <p className="text-muted-foreground text-xs">
        Publique conteúdo em mais de uma categoria para escolher a aba inicial.
      </p>
    );
  }

  async function handleSelect(tab: CreatorProfileTab) {
    if (!availableTabs.includes(tab) || saving || tab === selected) return;

    setSaving(true);
    setError(null);

    try {
      await userRepository.update(userId, { profileDefaultTab: tab });
      setSelected(tab);
      onSaved?.(tab);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar a preferência."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Aba inicial da sua página pública</Label>
      <p className="text-muted-foreground text-xs">
        Visitantes verão esta aba selecionada ao abrir seu perfil.
      </p>
      <div className="flex flex-wrap gap-2">
        {CREATOR_PROFILE_TAB_OPTIONS.map((option) => {
          const enabled = availableTabs.includes(option.value);
          const active = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={!enabled || saving}
              onClick={() => void handleSelect(option.value)}
              className={cn(
                "rounded-xl border-2 border-border px-3 py-2 text-sm font-bold shadow-cartoon-sm transition-all",
                "disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
