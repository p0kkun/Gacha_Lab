"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorModal from "./ErrorModal";

type ErrorModalOptions = {
  redirectTo?: string | null;
  confirmLabel?: string;
  title?: string;
};

type ErrorModalState = {
  isOpen: boolean;
  message: string;
  redirectTo: string | null;
  confirmLabel?: string;
  title?: string;
};

type ErrorModalContextValue = {
  showError: (message: string, options?: ErrorModalOptions) => void;
};

const ErrorModalContext = createContext<ErrorModalContextValue | null>(null);

export function ErrorModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<ErrorModalState>({
    isOpen: false,
    message: "",
    redirectTo: "/",
  });

  const showError = useCallback(
    (message: string, options?: ErrorModalOptions) => {
      setState({
        isOpen: true,
        message,
        redirectTo: options?.redirectTo ?? "/",
        confirmLabel: options?.confirmLabel,
        title: options?.title,
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    const redirectTo = state.redirectTo ?? "/";
    setState((prev) => ({ ...prev, isOpen: false }));
    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [router, state.redirectTo]);

  const value = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorModalContext.Provider value={value}>
      {children}
      <ErrorModal
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel ?? (state.redirectTo === "/" ? "ホームへ" : "移動する")}
        onConfirm={handleConfirm}
      />
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error("useErrorModal must be used within ErrorModalProvider");
  }
  return context;
}
