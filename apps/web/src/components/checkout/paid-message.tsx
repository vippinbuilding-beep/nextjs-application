import { Check } from "lucide-react";

/** Payment confirmed (Pix dialog and physical checkout). */
export function PaidMessage({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex animate-pop flex-col items-center gap-3 px-2 py-6 text-center">
      <span className="bg-success text-background flex size-14 items-center justify-center rounded-full">
        <Check className="size-7" strokeWidth={3} />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{text}</p>
      {children}
    </div>
  );
}
