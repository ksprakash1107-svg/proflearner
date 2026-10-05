"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Compass, GraduationCap, Loader2, PlayCircle, Search } from "lucide-react";

interface CourseSummary {
  id: string;
  title: string;
  subject: string;
  department: string | null;
  status: string;
  professor_name: string;
  lecture_count: number;
  enrolled: boolean;
  created_at: string;
}

interface PaginatedCourses {
  items: CourseSummary[];
  total: number;
  page: number;
  page_size: number;
}

export default function StudentCoursesCatalogPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const fetchCourses = async (query: string) => {
    setIsLoading(true);
    try {
      const url = query
        ? `/student/courses?q=${encodeURIComponent(query)}`
        : "/student/courses";
      const data = await apiClient<PaginatedCourses>(url);
      setCourses(data.items);
    } catch {
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(activeSearch);
  }, [activeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Course Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse published courses taught by professors and enroll to access interactive lectures
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, subject, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Search
        </Button>
        {activeSearch && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setActiveSearch("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Course List */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Searching published courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white">
          <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No published courses found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
            {activeSearch
              ? `No courses matched your query "${activeSearch}". Try another search term.`
              : "No courses have been published yet by faculty members. Check back soon!"}
          </p>
          {activeSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setActiveSearch("");
              }}
            >
              Reset Search Filter
            </Button>
          )}
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
                  {course.enrolled && <Badge variant="success">Enrolled</Badge>}
                </div>
                <CardTitle className="text-lg font-bold line-clamp-1">{course.title}</CardTitle>
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Prof. {course.professor_name}</span>
                </div>
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
                <Link href={`/student/courses/${course.id}`} className="w-full">
                  <Button
                    variant={course.enrolled ? "outline" : "default"}
                    size="sm"
                    className={`w-full text-xs ${
                      course.enrolled
                        ? ""
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {course.enrolled ? "View Course & Lectures" : "View Course Details"}
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
