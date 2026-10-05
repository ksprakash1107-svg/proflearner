"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
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
import { AlertCircle, CheckCircle2, GraduationCap, KeyRound, Loader2, Sparkles, User } from "lucide-react";

interface ProfessorProfileResponse {
  title: string | null;
  institution: string | null;
  department: string | null;
  bio: string | null;
  default_teaching_profile: TeachingProfileData;
}

export default function ProfessorProfilePage() {
  const { user, refetchUser } = useAuth();

  // Profile info state
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [teachingProfile, setTeachingProfile] = useState<TeachingProfileData>(DEFAULT_TEACHING_PROFILE);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient<ProfessorProfileResponse>("/professor/profile");
        setTitle(data.title || "");
        setInstitution(data.institution || "");
        setDepartment(data.department || "");
        setBio(data.bio || "");
        if (data.default_teaching_profile) {
          setTeachingProfile({
            ...DEFAULT_TEACHING_PROFILE,
            ...data.default_teaching_profile,
          });
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (user) {
      setFullName(user.full_name);
    }
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      await apiClient("/professor/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName.trim(),
          title: title.trim() || null,
          institution: institution.trim() || null,
          department: department.trim() || null,
          bio: bio.trim() || null,
          default_teaching_profile: teachingProfile,
        }),
      });

      setProfileMessage({ type: "success", text: "Academic profile and teaching preferences updated." });
      await refetchUser();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setProfileMessage({ type: "error", text: err.message });
      } else {
        setProfileMessage({ type: "error", text: "Failed to update profile." });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 10) {
      setPasswordMessage({ type: "error", text: "New password must be at least 10 characters long." });
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiClient("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      setPasswordMessage({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPasswordMessage({ type: "error", text: err.message });
      } else {
        setPasswordMessage({ type: "error", text: "Failed to change password. Please try again." });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Faculty Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your academic credentials and default teaching preferences</p>
      </div>

      {/* Profile Form */}
      <Card>
        <form onSubmit={handleSaveProfile}>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Academic Information</CardTitle>
                <CardDescription>Your university affiliation and profile details</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {profileMessage && (
              <div
                role="alert"
                className={`flex items-start space-x-2 rounded-lg p-3 text-sm border ${
                  profileMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={120}
                  disabled={isSavingProfile}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Academic Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Associate Professor, Chair"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  disabled={isSavingProfile}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution / University</Label>
                <Input
                  id="institution"
                  placeholder="e.g. Stanford University"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  maxLength={200}
                  disabled={isSavingProfile}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g. Electrical Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  maxLength={200}
                  disabled={isSavingProfile}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Biography</Label>
              <Textarea
                id="bio"
                placeholder="Brief academic biography or research areas..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={2000}
                rows={3}
                disabled={isSavingProfile}
              />
            </div>

            {/* Default Teaching Profile */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <Label className="text-sm font-semibold">Default Teaching Profile</Label>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                New courses will inherit these pedagogical defaults automatically.
              </p>
              <TeachingProfileForm
                value={teachingProfile}
                onChange={setTeachingProfile}
                disabled={isSavingProfile}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                "Save Profile Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your password to keep your faculty account secure</CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            {passwordMessage && (
              <div
                role="alert"
                className={`flex items-start space-x-2 rounded-lg p-3 text-sm border ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="At least 10 characters with letter and number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                disabled={isChangingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                disabled={isChangingPassword}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
