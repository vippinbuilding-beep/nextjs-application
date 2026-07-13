import { LayoutBackground } from "@vippin/ui/layout-background";
import { Card, CardContent, CardHeader, CardTitle } from "@vippin/ui/card";

export default function DashboardHomePage() {
  return (
    <LayoutBackground
      background="primary"
      className="flex min-h-svh flex-col items-center justify-center p-4 py-10"
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hello World</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm font-medium">
              Este é o app <strong>@vippin/dashboard</strong>, rodando de forma
              independente no monorepo e reaproveitando os componentes de{" "}
              <code>@vippin/ui</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </LayoutBackground>
  );
}
