import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth/server";
import { UserNav } from "@/components/navigation/UserNav";
import { BookOpen, Compass } from "lucide-react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer();

  if (!user) {
    redirect("/login?next=/student/dashboard");
  }

  if (user.role === "PROFESSOR") {
    redirect("/professor/dashboard");
  } else if (user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/student/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                P
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">ProfLearn</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
              <Link
                href="/student/dashboard"
                className="flex items-center space-x-1.5 text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-md transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>My Courses</span>
              </Link>
              <Link
                href="/student/courses"
                className="flex items-center space-x-1.5 text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md transition"
              >
                <Compass className="w-4 h-4" />
                <span>Browse Catalog</span>
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
