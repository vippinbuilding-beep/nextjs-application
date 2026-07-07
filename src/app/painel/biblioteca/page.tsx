"use client";

import { CreatorLibraryPanel } from "@/components/creator/creator-library-panel";
import { ScreenLoading } from "@/components/ui/screen-loading";
import { useCreatorPanelGuard } from "@/hooks/use-creator-panel-guard";

export default function CreatorLibraryPage() {
  const { user, loading } = useCreatorPanelGuard();

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return <CreatorLibraryPanel />;
}
