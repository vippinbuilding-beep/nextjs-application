"use client";

import { CreatorConsumerQuestionsPanel } from "@/components/creator/creator-consumer-questions-panel";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { useCreatorPanelGuard } from "@/hooks/use-creator-panel-guard";

export default function CreatorConsumerQuestionsPage() {
  const { user, loading } = useCreatorPanelGuard();

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return <CreatorConsumerQuestionsPanel />;
}
