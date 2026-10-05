import React from "react";
import Link from "next/link";
import { getCurrentUserServer } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Shield,
  Users,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUserServer();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Platform Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System overview, user management, and health metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
            System Healthy
          </Badge>
          <Badge variant="secondary" className="text-xs">
            v1.0 MVP
          </Badge>
        </div>
      </div>

      {/* Metric Cards (AD-1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Total Users
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">3</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">All registered</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Professors
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">1</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">Faculty accounts</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Students
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">1</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">Student accounts</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Courses
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">Created courses</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Documents
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">Uploaded PDFs</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase text-slate-500">
              Lectures
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">0</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <span className="text-[11px] text-slate-500">Generated</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Failed Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Failed Background Jobs</span>
                </CardTitle>
                <CardDescription>Tasks requiring admin inspection or replay</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                0 Failed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">All jobs healthy</p>
              <p className="text-xs text-slate-500 mt-1">
                No failed document processing or lecture generation tasks.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>Recent Audit Events</span>
                </CardTitle>
                <CardDescription>Security and administrative actions logged</CardDescription>
              </div>
              <Link href="/admin/audit-logs">
                <Button variant="outline" size="sm" className="text-xs">
                  View Full Log
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <div>
                  <span className="font-semibold text-slate-900">USER_LOGIN</span>
                  <span className="text-slate-500 ml-2">admin@example.edu</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Success
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <div>
                  <span className="font-semibold text-slate-900">SEED_DATABASE</span>
                  <span className="text-slate-500 ml-2">Initial seed executed</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  System
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
