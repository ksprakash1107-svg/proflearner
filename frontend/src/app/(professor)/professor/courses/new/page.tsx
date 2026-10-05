"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_TEACHING_PROFILE,
  TeachingProfileData,
  TeachingProfileForm,
} from "@/components/forms/TeachingProfileForm";
import { ApiError } from "@/lib/api/errors";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [teachingProfile, setTeachingProfile] = useState<TeachingProfileData>(DEFAULT_TEACHING_PROFILE);
  const [showProfileOptions, setShowProfileOptions] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const course = await apiClient<{ id: string }>("/professor/courses", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          department: department.trim() || undefined,
          description: description.trim(),
          teaching_profile: teachingProfile,
        }),
      });

      router.push(`/professor/courses/${course.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while creating the course.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <Link href="/professor/courses" className="hover:text-slate-800 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to Courses</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create New Course
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Set up a new course container to organize units, upload documents, and generate interactive lectures.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Course Details</CardTitle>
            <CardDescription>Basic information that will be visible to enrolled students</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                placeholder="e.g. CS 101: Introduction to Computer Science"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                disabled={isLoading}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject / Discipline</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Computer Science, Physics, History"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={120}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department (Optional)</Label>
                <Input
                  id="department"
                  placeholder="e.g. School of Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  maxLength={200}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe what students will learn in this course..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                rows={4}
                disabled={isLoading}
              />
            </div>

            {/* Expandable Teaching Profile Section */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProfileOptions(!showProfileOptions)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-800">
                    Course Teaching Profile (AI Style & Depth)
                  </span>
                </div>
                {showProfileOptions ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {showProfileOptions && (
                <div className="mt-3">
                  <TeachingProfileForm
                    value={teachingProfile}
                    onChange={setTeachingProfile}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Link href="/professor/courses">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isLoading || !title.trim() || !subject.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
