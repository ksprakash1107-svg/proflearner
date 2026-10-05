"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/errors";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface LectureSummary {
  id: string;
  title: string;
  position: number;
  status: string;
  slide_count: number;
  total_duration_seconds: number;
}

interface Unit {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  lectures: LectureSummary[];
}

interface CourseDetail {
  id: string;
  professor_id: string;
  professor_name: string;
  title: string;
  description: string;
  subject: string;
  department: string | null;
  status: string;
  enrolled: boolean;
  units: Unit[];
}

export default function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCourse = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<CourseDetail>(`/student/courses/${courseId}`);
      setCourse(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load course.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setErrorMessage(null);
    try {
      await apiClient(`/student/courses/${courseId}/enroll`, {
        method: "POST",
      });
      setSuccessMessage("Enrolled successfully! You now have access to all course lectures.");
      await fetchCourse();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to enroll in course.");
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Course not found</h2>
        <p className="text-sm text-slate-500 mb-6">{errorMessage || "This course may be unpublished or deleted."}</p>
        <Link href="/student/courses">
          <Button variant="outline">Browse Available Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/student/courses"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Catalog</span>
        </Link>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start space-x-2 rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-200"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="flex items-start space-x-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200"
        >
          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Course Banner */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 sm:p-8 text-white">
          <div className="flex items-center justify-between gap-4 mb-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-300">
              {course.subject}
            </span>
            {course.enrolled ? (
              <Badge variant="success" className="bg-emerald-500 text-white border-0">
                Enrolled
              </Badge>
            ) : (
              <Badge variant="outline" className="border-indigo-400 text-indigo-200">
                Available for Enrollment
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            {course.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-200">
            <div className="flex items-center space-x-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-300" />
              <span>Taught by Prof. {course.professor_name}</span>
            </div>
            {course.department && <span>• {course.department}</span>}
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">
              About This Course
            </h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              {course.description || "No course description provided."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Grounded in Professor {course.professor_name}&apos;s verified materials</span>
            </div>

            {!course.enrolled ? (
              <Button
                onClick={handleEnroll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  "Enroll in Course (Free)"
                )}
              </Button>
            ) : (
              <div className="flex items-center space-x-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>You are enrolled in this course</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Units & Lectures */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Curriculum & Lectures</h2>
          <p className="text-xs text-slate-500">
            {course.units.length} Unit{course.units.length === 1 ? "" : "s"}
          </p>
        </div>

        {course.units.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-white text-slate-500 text-sm">
            No units published yet for this course.
          </div>
        ) : (
          <div className="space-y-4">
            {course.units.map((unit) => (
              <Card key={unit.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50/80 py-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {unit.position}
                      </span>
                      <div>
                        <CardTitle className="text-base font-bold">{unit.title}</CardTitle>
                        {unit.description && (
                          <CardDescription className="text-xs mt-0.5">
                            {unit.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {unit.lectures.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 italic">
                      No published lectures in this unit yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {unit.lectures.map((lecture) => (
                        <div
                          key={lecture.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <PlayCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {lecture.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                {lecture.slide_count} slides
                              </div>
                            </div>
                          </div>

                          {course.enrolled ? (
                            <Link href={`/student/lectures/${lecture.id}`}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                Learn with AI Professor
                              </Button>
                            </Link>
                          ) : (
                            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Enroll to watch</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
