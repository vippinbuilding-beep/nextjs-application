"use client";

import { LoginRolePicker } from "@/components/auth/login-role-picker";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";

/** Step "Conta" for visitors: sign in and come back to this checkout. */
export function CheckoutLogin({ message }: { message: string }) {
  const returnPath = useCurrentReturnPath();
  return (
    <div className="bg-muted flex flex-col gap-3 rounded-2xl p-4">
      <p className="text-muted-foreground text-sm">{message}</p>
      <LoginRolePicker next={returnPath} />
    </div>
  );
}
