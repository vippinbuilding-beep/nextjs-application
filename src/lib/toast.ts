export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

export const TOAST_MESSAGES = {
  saved: "Alterações salvas com sucesso.",
  published: "Produto publicado com sucesso.",
  deleted: "Excluído com sucesso.",
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

let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

function push(message: string, variant: ToastVariant) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  toasts = [...toasts, { id, message, variant }];
  emit();

  window.setTimeout(() => {
    dismissToast(id);
  }, TOAST_DURATION_MS);
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
  saved() {
    push(TOAST_MESSAGES.saved, "success");
  },
  published() {
    push(TOAST_MESSAGES.published, "success");
  },
  deleted() {
    push(TOAST_MESSAGES.deleted, "success");
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
