"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FolderPlus,
  HelpCircle,
  Loader2,
  PlayCircle,
  Sparkles,
} from "lucide-react";

interface DashboardData {
  counts: {
    courses: number;
    draft_lectures: number;
    published_lectures: number;
  };
  active_jobs: Array<{ id: string; type: string; status: string }>;
  recent_questions: Array<{ id: string; question: string }>;
  engagement: {
    enrolled_total: number;
    completions_total: number;
    questions_7d: number;
  };
}

export default function ProfessorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient<DashboardData>("/professor/dashboard");
        setData(res);
      } catch {
        setData({
          counts: { courses: 0, draft_lectures: 0, published_lectures: 0 },
          active_jobs: [],
          recent_questions: [],
          engagement: { enrolled_total: 0, completions_total: 0, questions_7d: 0 },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const courseCount = data?.counts?.courses || 0;
  const publishedCount = data?.counts?.published_lectures || 0;
  const draftCount = data?.counts?.draft_lectures || 0;
  const enrolledCount = data?.engagement?.enrolled_total || 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Professor Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.full_name || "Professor"}. Manage your courses, documents, and interactive lectures.
          </p>
        </div>
        <div>
          <Link href="/professor/courses/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <FolderPlus className="w-4 h-4 mr-2" />
              <span>Create New Course</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Total Courses
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : courseCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Created courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Published Lectures
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : publishedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Live for student learning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Drafts / In Review
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : draftCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Awaiting review or generation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Enrolled Students
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : enrolledCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Across all courses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions & Courses */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Your Courses</CardTitle>
                  <CardDescription>Courses you currently own and teach</CardDescription>
                </div>
                <Link href="/professor/courses">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {courseCount === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-900 mb-1">No courses created yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Create your first course container to organize units and upload PDF teaching material.
                  </p>
                  <Link href="/professor/courses/new">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                      Create Your First Course
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    You have {courseCount} course{courseCount === 1 ? "" : "s"} under management.
                  </p>
                  <Link href="/professor/courses">
                    <Button size="sm" variant="outline" className="text-xs">
                      Manage Courses & Units
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Student Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Student Questions</CardTitle>
              <CardDescription>
                Contextual questions asked by students during interactive lectures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-400 text-sm">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No questions asked yet.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Jobs / Side Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Background Jobs</span>
                <Badge variant="secondary" className="text-xs">
                  {data?.active_jobs?.length || 0} Active
                </Badge>
              </CardTitle>
              <CardDescription>Document processing and AI lecture generation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 text-center py-6">
                No background tasks currently running.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-indigo-50/50 border-indigo-100">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Teaching Profile</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <p>
                Customize how the AI Teaching Assistant explains concepts to match your pedagogical style, tone, and rigor level.
              </p>
              <div className="pt-2">
                <Link href="/professor/profile">
                  <Button variant="outline" size="sm" className="w-full text-xs bg-white">
                    Configure Profile & Tone
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
