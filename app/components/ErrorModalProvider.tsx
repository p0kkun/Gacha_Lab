"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorModal from "./ErrorModal";
import InfoModal from "./InfoModal";

type ModalOptions = {
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

type InfoModalState = {
  isOpen: boolean;
  message: string;
  title: string;
  confirmLabel?: string;
  variant: "success" | "error" | "info";
  redirectTo: string | null;
};

type ErrorModalContextValue = {
  showError: (message: string, options?: ModalOptions) => void;
  showSuccess: (message: string, options?: ModalOptions) => void;
};

const ErrorModalContext = createContext<ErrorModalContextValue | null>(null);

export function ErrorModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [errorState, setErrorState] = useState<ErrorModalState>({
    isOpen: false,
    message: "",
    redirectTo: "/",
  });
  const [infoState, setInfoState] = useState<InfoModalState>({
    isOpen: false,
    message: "",
    title: "",
    redirectTo: null,
    variant: "info",
  });

  const showError = useCallback(
    (message: string, options?: ModalOptions) => {
      setErrorState({
        isOpen: true,
        message,
        redirectTo: options?.redirectTo ?? "/",
        confirmLabel: options?.confirmLabel,
        title: options?.title,
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, options?: ModalOptions) => {
      setInfoState({
        isOpen: true,
        message,
        title: options?.title ?? "完了",
        confirmLabel: options?.confirmLabel,
        variant: "success",
        redirectTo: options?.redirectTo ?? null,
      });
    },
    []
  );

  const handleErrorConfirm = useCallback(() => {
    const redirectTo = errorState.redirectTo ?? "/";
    setErrorState((prev) => ({ ...prev, isOpen: false }));
    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [router, errorState.redirectTo]);

  const handleInfoConfirm = useCallback(() => {
    const redirectTo = infoState.redirectTo;
    setInfoState((prev) => ({ ...prev, isOpen: false }));
    if (redirectTo) {
      router.push(redirectTo);
    }
  }, [router, infoState.redirectTo]);

  const value = useMemo(() => ({ showError, showSuccess }), [showError, showSuccess]);

  return (
    <ErrorModalContext.Provider value={value}>
      {children}
      <ErrorModal
        isOpen={errorState.isOpen}
        title={errorState.title}
        message={errorState.message}
        confirmLabel={errorState.confirmLabel ?? (errorState.redirectTo === "/" ? "ホームへ" : "移動する")}
        onConfirm={handleErrorConfirm}
      />
      <InfoModal
        isOpen={infoState.isOpen}
        title={infoState.title}
        message={infoState.message}
        confirmLabel={infoState.confirmLabel ?? "閉じる"}
        variant={infoState.variant}
        onConfirm={handleInfoConfirm}
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
