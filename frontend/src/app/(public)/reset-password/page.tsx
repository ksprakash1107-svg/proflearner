"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasMinLength = newPassword.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasLetter && hasDigit && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Reset token is missing from the URL. Please request a new link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!hasMinLength || !hasLetter || !hasDigit) {
      setErrorMessage("Please meet all password complexity requirements.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-2" />
          <CardTitle className="text-xl font-bold">Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or incomplete.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Request a new reset link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
          <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
          <CardDescription>
            Your password has been successfully updated. You can now sign in with your new credentials.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              Proceed to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-slate-200">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
          <KeyRound className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Set new password</CardTitle>
        <CardDescription>
          Enter your new password below to regain access to your account
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
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
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-200">
            <div
              className={`flex items-center space-x-1.5 ${
                hasMinLength ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300"}`}
              />
              <span>At least 10 characters</span>
            </div>
            <div
              className={`flex items-center space-x-1.5 ${
                hasLetter ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${hasLetter ? "text-emerald-600" : "text-slate-300"}`}
              />
              <span>Contains at least one letter</span>
            </div>
            <div
              className={`flex items-center space-x-1.5 ${
                hasDigit ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${hasDigit ? "text-emerald-600" : "text-slate-300"}`}
              />
              <span>Contains at least one number</span>
            </div>
            <div
              className={`flex items-center space-x-1.5 ${
                isMatch ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${isMatch ? "text-emerald-600" : "text-slate-300"}`}
              />
              <span>Passwords match</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            disabled={isLoading || !isPasswordValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update password"
            )}
          </Button>

          <Link href="/login" className="text-xs text-slate-500 hover:text-slate-800 text-center">
            Cancel and return to sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
