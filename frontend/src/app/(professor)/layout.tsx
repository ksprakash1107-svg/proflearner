import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/server";
import { UserNav } from "@/components/navigation/UserNav";
import { BookOpen, FolderPlus, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/login?next=/professor/dashboard");
  }

  if (user.role === "STUDENT") {
    redirect("/student/dashboard");
  } else if (user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/professor/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                P
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ProfLearn</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                Faculty
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
              <Link
                href="/professor/dashboard"
                className="flex items-center space-x-1.5 text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-md transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/professor/courses"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>My Courses</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/professor/courses/new" className="hidden sm:inline-block">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Create Course</span>
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
