import Link from "next/link";
import { BookOpen, GraduationCap, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              P
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">ProfLearn</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 sm:px-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Learning Grounded in Real Courses</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none mb-6">
            Learn from your professor&apos;s <span className="text-indigo-600">course material</span>.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            ProfLearn converts static PDFs into interactive, slide-based lectures with spoken narration.
            Ask questions at any slide, and the AI Teaching Assistant provides answers grounded directly in your course content.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl shadow-md transition"
            >
              <span>Explore as a Student</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register?role=PROFESSOR"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium px-6 py-3 rounded-xl transition shadow-sm"
            >
              <span>Teach as a Professor</span>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How ProfLearn Works</h2>
              <p className="text-slate-600 mt-2">Three straightforward steps to transform static documents into active learning.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Professor Uploads Material</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Professors upload lecture notes, slides, or textbook chapters in PDF format to organize units.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Lecture Generation</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Structured slides and narration are drafted for review. The professor inspects and publishes with full editorial control.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Contextual Q&A</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Students watch lectures with AI narration and ask questions. The AI Teaching Assistant answers using verified source citations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Grounding */}
        <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Grounded in Course Material, Never Hallucinated</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The AI Teaching Assistant answers questions strictly within the context of the active slide and the professor&apos;s uploaded materials.
                Every grounded claim displays exact document source citations, preserving authentic pedagogical authority.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 gap-4">
          <p>© 2026 ProfLearn. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-slate-700">Privacy Notice</Link>
            <Link href="/terms" className="hover:text-slate-700">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
