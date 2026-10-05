import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/server";
import { UserNav } from "@/components/navigation/UserNav";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/login?next=/admin/dashboard");
  }

  if (user.role === "STUDENT") {
    redirect("/student/dashboard");
  } else if (user.role === "PROFESSOR") {
    redirect("/professor/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-base">
                P
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ProfLearn</span>
              <span className="text-xs bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-full border border-red-200">
                Admin Console
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
              <Link
                href="/admin/dashboard"
                className="flex items-center space-x-1.5 text-slate-700 hover:text-red-600 px-3 py-2 rounded-md transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-red-600 px-3 py-2 rounded-md transition"
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </Link>
              <Link
                href="/admin/courses"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-red-600 px-3 py-2 rounded-md transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Courses</span>
              </Link>
              <Link
                href="/admin/audit-logs"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-red-600 px-3 py-2 rounded-md transition"
              >
                <Activity className="w-4 h-4" />
                <span>Audit Logs</span>
              </Link>
            </nav>
          </div>

          <UserNav />
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
