"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User as UserIcon } from "lucide-react";

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const profileHref =
    user.role === "PROFESSOR"
      ? "/professor/profile"
      : user.role === "ADMIN"
      ? "/admin/dashboard"
      : "/student/profile";

  return (
    <div className="flex items-center space-x-3">
      <div className="text-right hidden sm:block">
        <div className="text-sm font-semibold text-slate-900 leading-tight">
          {user.full_name}
        </div>
        <div className="text-xs text-slate-500">{user.email}</div>
      </div>

      <Badge
        variant={
          user.role === "ADMIN"
            ? "destructive"
            : user.role === "PROFESSOR"
            ? "default"
            : "secondary"
        }
        className="text-[11px] uppercase tracking-wider"
      >
        {user.role}
      </Badge>

      <Link href={profileHref}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Profile">
          <UserIcon className="h-4 w-4 text-slate-600" />
        </Button>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout()}
        className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
        title="Sign Out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
