"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/ui/auth-modal";
import { useRouter } from "next/navigation";

type AuthModalConfig = {
  title?: string;
  subtitle?: string;
  nextUrl?: string;
  onSuccess?: (user: any) => void;
};

type AuthContextType = {
  user: any;
  loading: boolean;
  openAuthModal: (config?: AuthModalConfig) => void;
  closeAuthModal: () => void;
  requireAuth: (config: AuthModalConfig | (() => void)) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<AuthModalConfig>({});
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((config: AuthModalConfig = {}) => {
    setModalConfig(config);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const requireAuth = useCallback(
    (config: AuthModalConfig | (() => void)): boolean => {
      if (user) {
        if (typeof config === "function") {
          config();
        } else if (config.onSuccess) {
          config.onSuccess(user);
        } else if (config.nextUrl) {
          router.push(config.nextUrl);
        }
        return true;
      }

      // Not logged in -> open Auth Modal with custom prompt
      const normalizedConfig: AuthModalConfig =
        typeof config === "function" ? { onSuccess: config } : config;

      openAuthModal(normalizedConfig);
      return false;
    },
    [user, openAuthModal, router]
  );

  const handleAuthSuccess = (authedUser: any) => {
    setUser(authedUser);
    setIsOpen(false);

    if (modalConfig.onSuccess) {
      modalConfig.onSuccess(authedUser);
    } else if (modalConfig.nextUrl) {
      window.location.href = modalConfig.nextUrl;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}

      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
        title={modalConfig.title || "Sign In to Continue"}
        subtitle={
          modalConfig.subtitle ||
          "Please sign in or create an account to access this feature."
        }
        nextUrl={modalConfig.nextUrl}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthModalProvider");
  }
  return context;
}
