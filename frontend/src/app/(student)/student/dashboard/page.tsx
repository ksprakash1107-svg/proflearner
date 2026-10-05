"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Compass, GraduationCap, Loader2, PlayCircle, Sparkles } from "lucide-react";

interface EnrolledCourse {
  id: string;
  title: string;
  subject: string;
  department: string | null;
  professor_name: string;
  lecture_count: number;
}

interface StudentDashboardData {
  enrolled_courses: EnrolledCourse[];
  continue_learning: {
    lecture_id: string;
    title: string;
    course_title: string;
    slide_number: number;
  } | null;
  recent_lectures: Array<{ id: string; title: string }>;
  completed_count: number;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient<StudentDashboardData>("/student/dashboard");
        setData(res);
      } catch {
        setData({
          enrolled_courses: [],
          continue_learning: null,
          recent_lectures: [],
          completed_count: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const enrolledCount = data?.enrolled_courses?.length || 0;
  const completedCount = data?.completed_count || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-100 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Learning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Welcome back, {user?.full_name || "Student"}!
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Continue learning from your professor&apos;s course material. Every slide is paired with AI narration, and you can ask questions anytime.
          </p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Enrolled Courses
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : enrolledCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Active enrollments in your program</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              Completed Lectures
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {isLoading ? "..." : completedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Lectures finished with slides reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-slate-500">
              AI Tutor Grounding
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">100%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Answers backed by verified course citations</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses / Empty State */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">My Enrolled Courses</h2>
          <Link href="/student/courses">
            <Button variant="outline" size="sm" className="text-xs">
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Browse All Courses
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mb-2" />
            <p className="text-sm">Loading your courses...</p>
          </div>
        ) : enrolledCount === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white">
            <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No enrolled courses yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Browse the course catalog to find courses published by your professors and start watching interactive lectures.
            </p>
            <Link href="/student/courses">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Explore Available Courses
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.enrolled_courses.map((course) => (
              <Card key={course.id} className="flex flex-col hover:border-slate-300 transition shadow-sm">
                <CardHeader className="pb-3">
                  <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase mb-1">
                    {course.subject}
                  </span>
                  <CardTitle className="text-lg font-bold line-clamp-1">{course.title}</CardTitle>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prof. {course.professor_name}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{course.lecture_count} Lectures</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t border-slate-100">
                  <Link href={`/student/courses/${course.id}`} className="w-full">
                    <Button variant="default" size="sm" className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                      Go to Course
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
