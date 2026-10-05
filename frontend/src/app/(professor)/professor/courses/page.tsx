"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchiveRestore, BookOpen, FolderPlus, Loader2, PlayCircle, Settings, Users } from "lucide-react";

interface CourseSummary {
  id: string;
  title: string;
  subject: string;
  department: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  lecture_count: number;
  created_at: string;
}

interface PaginatedCourses {
  items: CourseSummary[];
  total: number;
  page: number;
  page_size: number;
}

export default function ProfessorCoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCourses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const url = statusFilter
        ? `/professor/courses?status=${statusFilter}`
        : "/professor/courses";
      const data = await apiClient<PaginatedCourses>(url);
      setCourses(data.items);
    } catch {
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const handleUnarchive = async (courseId: string) => {
    try {
      setActionError(null);
      await apiClient(`/professor/courses/${courseId}/unarchive`, {
        method: "POST",
      });
      fetchCourses();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to unarchive course.");
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">Published</Badge>;
      case "ARCHIVED":
        return <Badge variant="secondary">Archived</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="warning">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            My Courses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your courses, organize units, and publish interactive lectures
          </p>
        </div>
        <Link href="/professor/courses/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <FolderPlus className="w-4 h-4 mr-2" />
            <span>Create Course</span>
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            statusFilter === ""
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          All Courses
        </button>
        <button
          onClick={() => setStatusFilter("PUBLISHED")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            statusFilter === "PUBLISHED"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setStatusFilter("DRAFT")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            statusFilter === "DRAFT"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Loading your courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No courses found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Get started by creating your first course. You can then add units and upload PDFs to generate lectures.
          </p>
          <Link href="/professor/courses/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Your First Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col hover:border-slate-300 transition shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                    {course.subject}
                  </span>
                  {getStatusBadge(course.status)}
                </div>
                <CardTitle className="text-lg font-bold line-clamp-1">{course.title}</CardTitle>
                <CardDescription className="text-xs">
                  {course.department || "General Department"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{course.lecture_count} Lectures</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Link href={`/professor/courses/${course.id}`}>
                    <Button variant="default" size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                      Manage Course
                    </Button>
                  </Link>
                  {course.status === "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                      onClick={() => handleUnarchive(course.id)}
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Unarchive
                    </Button>
                  )}
                </div>
                <Link href={`/professor/courses/${course.id}/settings`}>
                  <Button variant="ghost" size="sm" className="text-xs text-slate-600">
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    Settings
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
