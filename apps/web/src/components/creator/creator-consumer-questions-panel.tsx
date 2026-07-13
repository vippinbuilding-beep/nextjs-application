"use client";

import { AskMeConsumerInbox } from "@/components/ask-me/ask-me-consumer-inbox";
import { CreatorModuleHeader } from "@/components/creator/creator-module-header";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vippin/ui/card";
import { ScreenLoading } from "@vippin/ui/screen-loading";

export function CreatorConsumerQuestionsPanel() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <ScreenLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CreatorModuleHeader
        title="Minhas perguntas"
        description="Perguntas pagas enviadas a outros criadores."
      />

      <Card>
        <CardHeader>
          <CardTitle>Enviadas</CardTitle>
          <CardDescription>
            Acompanhe o status das suas perguntas. Se não houver resposta em 72h,
            o valor é estornado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AskMeConsumerInbox askerId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
