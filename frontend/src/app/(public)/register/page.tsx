"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");
  const initialRole = initialRoleParam === "PROFESSOR" ? "PROFESSOR" : "STUDENT";

  const { register } = useAuth();

  const [role, setRole] = useState<"STUDENT" | "PROFESSOR">(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password rules validation
  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasDigit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password satisfies all security requirements.");
      return;
    }

    setIsLoading(true);

    try {
      const user = await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (user.role === "PROFESSOR") {
        router.push("/professor/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.details && Array.isArray(err.details)) {
          const errors: Record<string, string> = {};
          for (const d of err.details) {
            if (d.field) {
              errors[d.field] = d.issue || err.message;
            }
          }
          setFieldErrors(errors);
        }
      } else {
        setErrorMessage("An unexpected error occurred during registration. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-slate-200">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
          P
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
        <CardDescription>
          Join ProfLearn to start teaching or learning from course material
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

          {/* Role selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">I want to join as a:</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("STUDENT")}
                className={`py-2.5 px-3 text-sm rounded-lg border text-center font-medium transition ${
                  role === "STUDENT"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole("PROFESSOR")}
                className={`py-2.5 px-3 text-sm rounded-lg border text-center font-medium transition ${
                  role === "PROFESSOR"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Professor
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              placeholder={role === "PROFESSOR" ? "Prof. Jane Doe" : "Jane Doe"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              disabled={isLoading}
            />
            {fieldErrors.full_name && (
              <p className="text-xs text-red-600">{fieldErrors.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              disabled={isLoading}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}

            {/* Password strength checklist */}
            <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-200">
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
                Creating account...
              </>
            ) : (
              `Register as ${role === "PROFESSOR" ? "Professor" : "Student"}`
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
