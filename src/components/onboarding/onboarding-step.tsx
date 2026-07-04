import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function OnboardingStep({
  step,
  totalSteps,
  title,
  description,
  children,
}: OnboardingStepProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full border-2 border-border bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-cartoon-sm">
            {step} / {totalSteps}
          </span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
