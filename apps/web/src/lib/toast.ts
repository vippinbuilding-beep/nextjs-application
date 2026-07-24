export type ToastVariant = "success" | "error" | "notification";

export type NotificationToastTone = "default" | "financial" | "financial-error";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  body?: string;
  href?: string;
  notificationTone?: NotificationToastTone;
}

export const TOAST_MESSAGES = {
  saved: "Alterações salvas com sucesso.",
  published: "Produto publicado com sucesso.",
  cancelled: "Produto cancelado com sucesso.",
  restored: "Produto restaurado com sucesso.",
  added: "Adicionado com sucesso.",
  removed: "Removido com sucesso.",
  sent: "Enviado com sucesso.",
  defaultTab: "Aba inicial atualizada.",
  settingsSaved: "Configurações salvas.",
  commentSent: "Comentário enviado.",
  commentDeleted: "Comentário removido.",
  answerSent: "Resposta enviada.",
  declined: "Pergunta recusada e valor estornado.",
  notificationsRead: "Notificações marcadas como lidas.",
} as const;

const TOAST_DURATION_MS = 4_000;
const NOTIFICATION_TOAST_DURATION_MS = 6_000;

let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

function scheduleDismiss(id: string, durationMs: number) {
  window.setTimeout(() => {
    dismissToast(id);
  }, durationMs);
}

function push(message: string, variant: ToastVariant) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  toasts = [...toasts, { id, message, variant }];
  emit();
  scheduleDismiss(id, TOAST_DURATION_MS);
}

function pushNotification(input: {
  title: string;
  body?: string;
  href?: string;
  notificationTone?: NotificationToastTone;
}) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  toasts = [
    ...toasts,
    {
      id,
      message: input.title,
      variant: "notification",
      title: input.title,
      body: input.body,
      href: input.href,
      notificationTone: input.notificationTone ?? "default",
    },
  ];
  emit();
  scheduleDismiss(id, NOTIFICATION_TOAST_DURATION_MS);
}

export function dismissToast(id: string) {
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function subscribeToasts(listener: (items: ToastItem[]) => void) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(message: string) {
    push(message, "success");
  },
  error(message: string) {
    push(message, "error");
  },
  notification(input: {
    title: string;
    body?: string;
    href?: string;
    notificationTone?: NotificationToastTone;
  }) {
    pushNotification(input);
  },
  saved() {
    push(TOAST_MESSAGES.saved, "success");
  },
  published() {
    push(TOAST_MESSAGES.published, "success");
  },
  cancelled() {
    push(TOAST_MESSAGES.cancelled, "success");
  },
  restored() {
    push(TOAST_MESSAGES.restored, "success");
  },
  added() {
    push(TOAST_MESSAGES.added, "success");
  },
  removed() {
    push(TOAST_MESSAGES.removed, "success");
  },
  sent() {
    push(TOAST_MESSAGES.sent, "success");
  },
};
