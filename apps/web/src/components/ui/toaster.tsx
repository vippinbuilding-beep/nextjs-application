"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { subscribeToasts } from "@/lib/toast";

/** A pilha animada (Motion) só baixa quando aparece o primeiro aviso. */
const ToastStack = dynamic(() => import("./toast-stack"), { ssr: false });

export function Toaster() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    return subscribeToasts((items) => {
      if (items.length > 0) setArmed(true);
    });
  }, []);

  return armed ? <ToastStack /> : null;
}
