"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkSessionStatus, logoutAdmin } from "@/lib/auth/actions";
import { Loader2 } from "lucide-react";

export type AuthStatus = "INITIALIZING" | "AUTHENTICATED" | "UNAUTHENTICATED" | "EXPIRED";

interface AuthContextValue {
  user: string | null;
  role: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  status: "INITIALIZING",
  isAuthenticated: false,
  logout: async () => {},
  refreshSession: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const AUTH_CHANNEL_NAME = "orbit_auth_sync";
const STORAGE_SYNC_KEY = "orbit_session_sync_event";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Broadcast cross-tab event
  const broadcastAuthEvent = useCallback((type: "LOGIN" | "LOGOUT", userData?: { user: string; role: string }) => {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.postMessage({ type, ...userData, timestamp: Date.now() });
        channel.close();
      }
    } catch {
      // Fallback to storage event
      try {
        localStorage.setItem(
          STORAGE_SYNC_KEY,
          JSON.stringify({ type, ...userData, timestamp: Date.now() })
        );
      } catch {
        // Ignore
      }
    }
  }, []);

  // Perform session verification
  const checkAuth = useCallback(async () => {
    try {
      const res = await checkSessionStatus();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setRole(res.role || "SUPER_ADMIN");
        setStatus("AUTHENTICATED");
      } else {
        setUser(null);
        setRole(null);
        if (res.reason === "EXPIRED") {
          setStatus("EXPIRED");
        } else {
          setStatus("UNAUTHENTICATED");
        }
      }
    } catch {
      // On network failure, do not immediately treat user as logged out if already authenticated
      setStatus((prev) => (prev === "INITIALIZING" ? "UNAUTHENTICATED" : prev));
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      setUser(null);
      setRole(null);
      setStatus("UNAUTHENTICATED");
      broadcastAuthEvent("LOGOUT");
      router.push("/ad/login");
    }
  }, [broadcastAuthEvent, router]);

  // Initial check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Multi-tab synchronization listener
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    function handleEvent(data: { type?: string; user?: string; role?: string }) {
      if (data.type === "LOGOUT") {
        setUser(null);
        setRole(null);
        setStatus("UNAUTHENTICATED");
        if (pathname?.startsWith("/ad") && pathname !== "/ad/login") {
          router.push("/ad/login?reason=logged_out");
        }
      } else if (data.type === "LOGIN") {
        setUser(data.user || null);
        setRole(data.role || "SUPER_ADMIN");
        setStatus("AUTHENTICATED");
        router.refresh();
      }
    }

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event.data) {
            handleEvent(event.data);
          }
        };
      }
    } catch {
      // Channel not available
    }

    // LocalStorage fallback listener
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_SYNC_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleEvent(parsed);
        } catch {
          // Ignore
        }
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname, router]);

  // Periodic heartbeat (every 3 minutes) keeping active sessions alive
  useEffect(() => {
    if (status !== "AUTHENTICATED") return;

    const interval = setInterval(() => {
      checkAuth();
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [status, checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        status,
        isAuthenticated: status === "AUTHENTICATED",
        logout,
        refreshSession: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
