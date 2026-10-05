"use client";

import React, { useEffect, useState, use } from "react";
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
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Sparkles } from "lucide-react";

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  subject: string;
  department: string | null;
  status: string;
  teaching_profile: TeachingProfileData;
}

export default function CourseSettingsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [teachingProfile, setTeachingProfile] = useState<TeachingProfileData>(DEFAULT_TEACHING_PROFILE);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const data = await apiClient<CourseDetail>(`/professor/courses/${courseId}`);
        setTitle(data.title);
        setSubject(data.subject);
        setDepartment(data.department || "");
        setDescription(data.description || "");
        if (data.teaching_profile) {
          setTeachingProfile({
            ...DEFAULT_TEACHING_PROFILE,
            ...data.teaching_profile,
          });
        }
      } catch {
        setErrorMessage("Failed to load course settings.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      await apiClient(`/professor/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          department: department.trim() || null,
          description: description.trim(),
          teaching_profile: teachingProfile,
        }),
      });

      setSuccessMessage("Course settings and teaching profile updated successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while updating the course.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm">Loading course settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/professor/courses/${courseId}`}
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Course Overview</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Course Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure metadata and the AI Teaching Assistant&apos;s pedagogical profile for this course
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
            <CardDescription>Course title, subject classification, and description</CardDescription>
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
            {successMessage && (
              <div
                role="status"
                className="flex items-start space-x-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                disabled={isSaving}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={120}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  maxLength={200}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                rows={4}
                disabled={isSaving}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <Label className="text-sm font-semibold">Course Teaching Profile</Label>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Configures tone, difficulty, explanation style, and rules for this specific course.
              </p>
              <TeachingProfileForm
                value={teachingProfile}
                onChange={setTeachingProfile}
                disabled={isSaving}
              />
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Link href={`/professor/courses/${courseId}`}>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isSaving || !title.trim() || !subject.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
