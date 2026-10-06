"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Zap,
  GraduationCap,
  BookOpen,
  Shield,
  LogOut,
  ExternalLink,
  ChevronDown,
  X,
  Loader2,
  CheckCircle2,
  Terminal,
} from "lucide-react";

export function DevMasterTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { user, refetchUser, logout } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+D or Cmd+Shift+D
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close when clicking outside panel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    return null;
  }

  const handleBypass = async (role: "PROFESSOR" | "STUDENT" | "ADMIN", targetRoute: string) => {
    try {
      setLoadingRole(role);
      await apiClient("/auth/dev-bypass", {
        method: "POST",
        body: JSON.stringify({ role }),
      });

      await refetchUser();

      toast.success(`⚡ Bypassed as ${role}`, {
        description: `Logged in as Master Dev ${role.charAt(0) + role.slice(1).toLowerCase()}`,
      });

      router.push(targetRoute);
      router.refresh();
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute dev bypass";
      toast.error("Dev Bypass Failed", { description: msg });
    } finally {
      setLoadingRole(null);
    }
  };

  const handleLogout = async () => {
    try {
      setLoadingRole("LOGOUT");
      await logout();
      toast.info("Logged out from dev session");
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log out";
      toast.error("Logout Error", { description: msg });
    } finally {
      setLoadingRole(null);
    }
  };

  const roleBadge = () => {
    if (!user) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Guest
        </span>
      );
    }

    const colors: Record<string, string> = {
      PROFESSOR: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      STUDENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
          colors[user.role] || "bg-neutral-800 text-neutral-300 border-neutral-700"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {user.role}
      </span>
    );
  };

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50 select-none font-sans">
      {/* Floating Panel */}
      {isOpen && (
        <div className="absolute bottom-11 right-0 w-80 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 shadow-2xl text-neutral-100 overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-800/80 border-b border-neutral-700/60">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold tracking-wide text-neutral-200">
                DEV MASTER BYPASS
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Session Info */}
          <div className="px-3.5 py-2 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">
                Active Session
              </span>
              <span className="text-xs font-medium text-neutral-200 truncate">
                {user ? user.email : "Not signed in"}
              </span>
            </div>
            <div>{roleBadge()}</div>
          </div>

          {/* 1-Click Role Switchers */}
          <div className="p-3 space-y-2">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-0.5">
              Instant Role Bypass
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {/* Professor */}
              <button
                disabled={loadingRole !== null}
                onClick={() => handleBypass("PROFESSOR", "/professor/courses")}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  user?.role === "PROFESSOR"
                    ? "bg-indigo-950/40 border-indigo-500/50 text-indigo-200 hover:bg-indigo-900/40"
                    : "bg-neutral-800/60 hover:bg-neutral-800 border-neutral-750 text-neutral-200 hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      Professor
                      {user?.role === "PROFESSOR" && (
                        <CheckCircle2 className="w-3 h-3 text-indigo-400 inline" />
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400">dev_professor@proflearn.local</div>
                  </div>
                </div>
                {loadingRole === "PROFESSOR" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <span className="text-[10px] text-indigo-400 font-mono">/courses</span>
                )}
              </button>

              {/* Student */}
              <button
                disabled={loadingRole !== null}
                onClick={() => handleBypass("STUDENT", "/student/courses")}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  user?.role === "STUDENT"
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/40"
                    : "bg-neutral-800/60 hover:bg-neutral-800 border-neutral-750 text-neutral-200 hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      Student
                      {user?.role === "STUDENT" && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400">dev_student@proflearn.local</div>
                  </div>
                </div>
                {loadingRole === "STUDENT" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono">/courses</span>
                )}
              </button>

              {/* Admin */}
              <button
                disabled={loadingRole !== null}
                onClick={() => handleBypass("ADMIN", "/admin/dashboard")}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  user?.role === "ADMIN"
                    ? "bg-purple-950/40 border-purple-500/50 text-purple-200 hover:bg-purple-900/40"
                    : "bg-neutral-800/60 hover:bg-neutral-800 border-neutral-750 text-neutral-200 hover:border-neutral-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                      Admin
                      {user?.role === "ADMIN" && (
                        <CheckCircle2 className="w-3 h-3 text-purple-400 inline" />
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400">admin@example.edu</div>
                  </div>
                </div>
                {loadingRole === "ADMIN" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <span className="text-[10px] text-purple-400 font-mono">/admin</span>
                )}
              </button>
            </div>

            {/* Quick Links / Docs */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-neutral-400 hover:text-amber-400 transition-colors"
              >
                <Terminal className="w-3 h-3" />
                Swagger Docs
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>

              {user && (
                <button
                  disabled={loadingRole !== null}
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-rose-400/90 hover:text-rose-300 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-3 h-3" />
                  Clear Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Small Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all duration-200 border ${
          isOpen
            ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-amber-500/20"
            : "bg-neutral-900/95 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 hover:border-amber-500/50 shadow-black/40 hover:shadow-amber-500/10"
        } backdrop-blur-sm active:scale-95`}
        title="Dev Master Tool (Ctrl+Shift+D)"
        aria-label="Toggle Dev Master Bypass"
      >
        <Zap
          className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
            isOpen ? "text-neutral-950 fill-neutral-950" : "text-amber-400 fill-amber-400/30"
          }`}
        />
        <span className="tracking-tight font-mono text-[11px]">
          {user ? user.role.slice(0, 4) : "DEV"}
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            user ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
          }`}
        />
        <ChevronDown
          className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-neutral-900" : ""
          }`}
        />
      </button>
    </div>
  );
}
