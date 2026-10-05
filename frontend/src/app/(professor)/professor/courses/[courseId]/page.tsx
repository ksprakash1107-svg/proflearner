"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/errors";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  FileText,
  FolderPlus,
  Loader2,
  PlayCircle,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Upload,
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
  created_at: string;
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
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  moderation_note: string | null;
  units: Unit[];
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;
  const router = useRouter();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New unit form state
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitDescription, setUnitDescription] = useState("");
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>("");

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsGenerating(true);
    setGenerationProgress("Reading PDF document and extracting content...");
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setGenerationProgress("AI is analyzing material and generating presentation slides with teaching narration...");
      const res = await fetch(`/api/v1/professor/courses/${courseId}/generate-from-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || "Failed to generate presentation from PDF.");
      }

      const newLecture = await res.json();
      setSuccessMessage(`Successfully generated interactive presentation "${newLecture.title}" with ${newLecture.slide_count} slides!`);
      setSelectedFile(null);
      await fetchCourse();
      router.push(`/professor/courses/${courseId}/lectures/${newLecture.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload PDF and generate presentation.");
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  const fetchCourse = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<CourseDetail>(`/professor/courses/${courseId}`);
      setCourse(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load course details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handlePublish = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await apiClient<CourseDetail>(`/professor/courses/${courseId}/publish`, {
        method: "POST",
      });
      setCourse(updated);
      setSuccessMessage("Course published successfully! It is now visible to students.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to publish course.");
      }
    }
  };

  const handleUnpublish = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await apiClient<CourseDetail>(`/professor/courses/${courseId}/unpublish`, {
        method: "POST",
      });
      setCourse(updated);
      setSuccessMessage("Course unpublished and reverted to draft.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to unpublish course.");
      }
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this course? It will be hidden from new students.")) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await apiClient<CourseDetail>(`/professor/courses/${courseId}/archive`, {
        method: "POST",
      });
      setCourse(updated);
      setSuccessMessage("Course archived successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to archive course.");
      }
    }
  };

  const handleUnarchive = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await apiClient<CourseDetail>(`/professor/courses/${courseId}/unarchive`, {
        method: "POST",
      });
      setCourse(updated);
      setSuccessMessage("Course unarchived successfully and restored to active draft.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to unarchive course.");
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this course? This action cannot be undone.")) {
      return;
    }
    setErrorMessage(null);
    try {
      await apiClient(`/professor/courses/${courseId}`, {
        method: "DELETE",
      });
      router.push("/professor/courses");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to delete course.");
      }
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim()) return;

    setIsSavingUnit(true);
    setErrorMessage(null);
    try {
      await apiClient(`/professor/courses/${courseId}/units`, {
        method: "POST",
        body: JSON.stringify({
          title: unitTitle.trim(),
          description: unitDescription.trim(),
        }),
      });
      setUnitTitle("");
      setUnitDescription("");
      setIsAddingUnit(false);
      await fetchCourse();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to add unit.");
      }
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) {
      return;
    }
    setErrorMessage(null);
    try {
      await apiClient(`/professor/units/${unitId}`, {
        method: "DELETE",
      });
      await fetchCourse();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to delete unit.");
      }
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
        <p className="text-sm text-slate-500 mb-6">{errorMessage || "The requested course does not exist."}</p>
        <Link href="/professor/courses">
          <Button variant="outline">Back to courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/professor/courses"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to All Courses</span>
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

      {/* Archived Status Alert */}
      {course.status === "ARCHIVED" && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 text-sm text-amber-900 border border-amber-200">
          <div className="flex items-center space-x-2">
            <Archive className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>This course is archived and hidden from students. Click unarchive to restore it.</span>
          </div>
          <Button
            size="sm"
            onClick={handleUnarchive}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs ml-4 flex-shrink-0"
          >
            <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
            Unarchive Course
          </Button>
        </div>
      )}

      {/* Course Header Banner */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1.5">
                <Badge
                  variant={
                    course.status === "PUBLISHED"
                      ? "success"
                      : course.status === "ARCHIVED"
                      ? "secondary"
                      : "warning"
                  }
                >
                  {course.status}
                </Badge>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  {course.subject}
                </span>
                {course.department && (
                  <span className="text-xs text-slate-500">· {course.department}</span>
                )}
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold">{course.title}</CardTitle>
              {course.description && (
                <CardDescription className="text-sm mt-2 max-w-2xl leading-relaxed">
                  {course.description}
                </CardDescription>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {course.status === "DRAFT" && (
                <Button
                  onClick={handlePublish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  Publish Course
                </Button>
              )}

              {course.status === "PUBLISHED" && (
                <Button
                  onClick={handleUnpublish}
                  variant="outline"
                  className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  Unpublish
                </Button>
              )}

              {course.status !== "ARCHIVED" ? (
                <Button
                  onClick={handleArchive}
                  variant="outline"
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  Archive
                </Button>
              ) : (
                <Button
                  onClick={handleUnarchive}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                  Unarchive Course
                </Button>
              )}

              <Link href={`/professor/courses/${courseId}/settings`}>
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="w-3.5 h-3.5 mr-1" />
                  Settings
                </Button>
              </Link>

              <Button
                onClick={handleDelete}
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Presentation Generator Box */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base sm:text-lg font-bold">
              AI Presentation Generator
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Upload your course PDF (notes, book chapter, or slides). The AI will immediately parse the text, generate structured presentation slides, write a natural teaching script, and let you teach it with voice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="pdfUpload"
                className="flex-1 flex items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 bg-white cursor-pointer transition text-center group"
              >
                <Upload className="w-5 h-5 text-indigo-600 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 truncate max-w-md">
                  {selectedFile ? selectedFile.name : "Choose or drag a course PDF document (max 25MB)..."}
                </span>
                <input
                  id="pdfUpload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  disabled={isGenerating}
                />
              </label>

              <Button
                type="submit"
                disabled={!selectedFile || isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm h-12 px-6 flex-shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Presentation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate & Teach Presentation
                  </>
                )}
              </Button>
            </div>

            {isGenerating && generationProgress && (
              <div className="flex items-center space-x-2 text-xs text-indigo-700 font-medium bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{generationProgress}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Units Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Course Units</h2>
            <p className="text-xs text-slate-500">
              Organize your curriculum into ordered units. Each unit contains documents and interactive lectures.
            </p>
          </div>
          {!isAddingUnit && (
            <Button
              onClick={() => setIsAddingUnit(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Unit
            </Button>
          )}
        </div>

        {/* Inline Add Unit Form */}
        {isAddingUnit && (
          <Card className="border-indigo-200 bg-indigo-50/30">
            <form onSubmit={handleAddUnit}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">New Unit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="unitTitle" className="text-xs">
                    Unit Title
                  </Label>
                  <Input
                    id="unitTitle"
                    placeholder="e.g. Unit 1: Foundations & Core Concepts"
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    required
                    maxLength={200}
                    disabled={isSavingUnit}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unitDesc" className="text-xs">
                    Description (Optional)
                  </Label>
                  <Input
                    id="unitDesc"
                    placeholder="Short summary of topics covered in this unit"
                    value={unitDescription}
                    onChange={(e) => setUnitDescription(e.target.value)}
                    maxLength={5000}
                    disabled={isSavingUnit}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-end space-x-2 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingUnit(false)}
                  disabled={isSavingUnit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSavingUnit || !unitTitle.trim()}
                >
                  {isSavingUnit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Unit"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Units List */}
        {course.units.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-white">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="font-semibold text-slate-900 text-sm mb-1">No units created yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Add your first unit to begin organizing documents and generating lectures.
            </p>
            <Button
              onClick={() => setIsAddingUnit(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Unit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {course.units.map((unit) => (
              <Card key={unit.id} className="shadow-xs hover:border-slate-300 transition">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {unit.position}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{unit.title}</CardTitle>
                        {unit.description && (
                          <CardDescription className="text-xs mt-0.5">
                            {unit.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleDeleteUnit(unit.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-400 hover:text-red-600 p-1 h-8 w-8"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Lectures inside Unit */}
                <CardContent className="pt-0 pb-4">
                  {unit.lectures.length === 0 ? (
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 flex items-center justify-between">
                      <span>No presentations in this unit yet.</span>
                      <span className="text-[11px] text-indigo-600 font-medium">
                        Upload a PDF above to generate your presentation slides!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unit.lectures.map((lec) => (
                        <div
                          key={lec.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/60 gap-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                              <PlayCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm block">
                                {lec.title}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {lec.slide_count} Slides · ~{Math.max(1, Math.round(lec.total_duration_seconds / 60))} mins
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={lec.status === "PUBLISHED" ? "success" : "secondary"} className="text-[10px]">
                              {lec.status}
                            </Badge>
                            <Link href={`/professor/courses/${courseId}/lectures/${lec.id}`}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                Teach Presentation
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
