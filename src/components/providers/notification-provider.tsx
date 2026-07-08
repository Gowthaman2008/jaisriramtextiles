"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error";
type ToastItem = { id: number; message: string; type: ToastType };

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type ConfirmState = (ConfirmOptions & { message: string; resolve: (value: boolean) => void }) | null;

type NotificationContextType = {
  /** Drop-in replacement for window.alert() — shows an in-app toast instead. */
  notify: (message: string, type?: ToastType) => void;
  /** Drop-in replacement for window.confirm() — shows an in-app modal, resolves true/false. */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let toastIdCounter = 0;

// Messages containing these words are styled as errors when no explicit type is given
const ERROR_HINT = /error|failed|unable to|invalid|denied|not found|required|please (enter|fill|select|provide|choose)/i;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message: string, type?: ToastType) => {
    const resolvedType: ToastType = type || (ERROR_HINT.test(message) ? "error" : "success");
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type: resolvedType }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve, ...options });
    });
  }, []);

  function handleConfirmChoice(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="fixed bottom-24 left-4 right-4 z-[100] flex flex-col gap-2 items-stretch sm:items-end sm:left-auto sm:right-6 sm:bottom-6 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto w-full sm:max-w-sm bg-white border border-line rounded-2xl shadow-lift p-4 flex items-start gap-3"
            >
              <span
                className={cn(
                  "shrink-0 grid place-items-center h-8 w-8 rounded-full",
                  t.type === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                )}
              >
                {t.type === "error" ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
              </span>
              <p className="flex-1 min-w-0 text-sm text-ink pt-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 p-1 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
            onClick={() => handleConfirmChoice(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lift max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg text-ink mb-2">
                {confirmState.title || (confirmState.danger ? "Are you sure?" : "Please confirm")}
              </h3>
              <p className="text-sm text-taupe leading-relaxed">{confirmState.message}</p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => handleConfirmChoice(false)}
                  className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-ink hover:bg-cream transition-colors cursor-pointer"
                >
                  {confirmState.cancelLabel || "Cancel"}
                </button>
                <button
                  onClick={() => handleConfirmChoice(true)}
                  className={cn(
                    "flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer",
                    confirmState.danger ? "bg-danger hover:bg-danger/90" : "bg-zari hover:bg-zari-deep"
                  )}
                >
                  {confirmState.confirmLabel || "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within a NotificationProvider");
  return ctx;
}
