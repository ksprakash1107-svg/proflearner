"use client";

import React, { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/errors";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";

interface SlideData {
  id: string;
  slide_number: number;
  title: string;
  content: {
    bullets?: string[];
    key_takeaway?: string;
    visual_cue?: string;
  };
  narration_script: string;
  duration_seconds: number;
}

interface LectureDetail {
  id: string;
  course_id: string;
  unit_id: string;
  title: string;
  description: string;
  status: string;
  slide_count: number;
  total_duration_seconds: number;
  slides: SlideData[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  slideNumber: number;
}

export default function ProfessorLecturePlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lectureId: string }>;
}) {
  const resolvedParams = use(params);
  const { courseId, lectureId } = resolvedParams;

  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showScript, setShowScript] = useState(false);

  // Q&A state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const data = await apiClient<LectureDetail>(
          `/professor/courses/${courseId}/lectures/${lectureId}`
        );
        setLecture(data);
      } catch {
        setError("Failed to load lecture presentation.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLecture();

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [courseId, lectureId]);

  const currentSlide = lecture?.slides[currentSlideIndex];

  // Speech narration handler
  const speakCurrentSlide = React.useCallback(
    (slide: SlideData) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(slide.narration_script);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        if (autoAdvance && lecture && currentSlideIndex < lecture.slides.length - 1) {
          setCurrentSlideIndex((prev) => prev + 1);
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speechRate, autoAdvance, lecture, currentSlideIndex]
  );

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (currentSlide) {
        speakCurrentSlide(currentSlide);
      }
    }
  };

  const handleRestartSpeech = () => {
    if (currentSlide) {
      speakCurrentSlide(currentSlide);
    }
  };

  const handleNextSlide = () => {
    if (lecture && currentSlideIndex < lecture.slides.length - 1) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      }
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      }
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleAskQuestion = async (customQuestion?: string) => {
    const q = customQuestion || questionInput.trim();
    if (!q || !lecture || !currentSlide) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: q,
      slideNumber: currentSlide.slide_number,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setQuestionInput("");
    setIsAsking(true);

    try {
      const res = await apiClient<{ answer: string; slide_number: number }>(
        `/professor/courses/${courseId}/lectures/${lectureId}/ask`,
        {
          method: "POST",
          body: JSON.stringify({
            slide_number: currentSlide.slide_number,
            question: q,
          }),
        }
      );

      const aiMsg: ChatMessage = {
        sender: "ai",
        text: res.answer,
        slideNumber: currentSlide.slide_number,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        sender: "ai",
        text: "I could not answer right now. Please try rephrasing your question.",
        slideNumber: currentSlide.slide_number,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading presentation slides and AI teacher...</p>
      </div>
    );
  }

  if (!lecture || !currentSlide) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Presentation not found</h2>
        <p className="text-sm text-slate-500 mb-4">{error || "No slides found in this presentation."}</p>
        <Link href={`/professor/courses/${courseId}`}>
          <Button variant="outline">Back to Course</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href={`/professor/courses/${courseId}`}
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Course Overview</span>
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-900 truncate max-w-md">
            {lecture.title}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
            <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
            Slide {currentSlideIndex + 1} of {lecture.slides.length}
          </Badge>

          <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto-advance slides</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Presentation Stage & AI Tutor Panel */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Left: Presentation Stage (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Slide Screen Canvas */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-slate-800 min-h-[460px] flex flex-col justify-between overflow-hidden">
            {/* Visual background ambient glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Slide Header */}
            <div className="relative z-10">
              <div className="flex items-center justify-between text-xs text-indigo-300 mb-3 uppercase tracking-wider font-semibold">
                <span>{currentSlide.content?.visual_cue || "Interactive Presentation"}</span>
                <span>Slide {currentSlideIndex + 1} / {lecture.slides.length}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-6">
                {currentSlide.title}
              </h2>

              {/* Bullet Points */}
              <div className="space-y-4 max-w-2xl">
                {currentSlide.content?.bullets?.map((bullet, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm sm:text-base text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Takeaway Callout */}
            {currentSlide.content?.key_takeaway && (
              <div className="relative z-10 mt-8 rounded-xl bg-indigo-900/40 border border-indigo-500/30 p-4 flex items-start space-x-3">
                <Lightbulb className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">Key Takeaway</div>
                  <p className="text-xs sm:text-sm text-indigo-100 mt-0.5">{currentSlide.content.key_takeaway}</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Professor Teaching Audio Bar */}
          <Card className="border-indigo-100 shadow-sm bg-white">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handlePlayPause}
                  className={`rounded-full h-11 w-11 p-0 shadow ${
                    isPlaying
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                  aria-label={isPlaying ? "Pause AI Professor" : "Start AI Professor Teaching"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>

                <div>
                  <div className="flex items-center space-x-2">
                    <Volume2 className={`w-4 h-4 ${isPlaying ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-900">
                      {isPlaying ? "AI Professor is Teaching..." : "Teach This Slide"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Spoken explanation powered by AI narration
                  </p>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestartSpeech}
                  title="Restart speech"
                  className="h-8 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Replay
                </Button>

                <div className="flex items-center border border-slate-200 rounded-lg p-0.5 text-xs text-slate-600">
                  {[1.0, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        speechRate === rate ? "bg-indigo-600 text-white" : "hover:text-slate-900"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextSlide}
                    disabled={currentSlideIndex === lecture.slides.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toggleable Narration Script Drawer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center">
                <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Spoken Lecture Transcript
              </span>
              <button
                onClick={() => setShowScript(!showScript)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showScript ? "Hide Transcript" : "Show Transcript"}
              </button>
            </div>
            {showScript && (
              <p className="text-xs leading-relaxed text-slate-600 pt-2 border-t border-slate-200">
                {currentSlide.narration_script}
              </p>
            )}
          </div>
        </div>

        {/* Right: Contextual AI Tutor Q&A */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 shadow-sm flex flex-col h-[600px]">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  AI
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">AI Teaching Assistant</CardTitle>
                  <p className="text-xs text-slate-500">
                    Ask questions grounded in Slide #{currentSlide.slide_number}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Chat Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Pause anytime and ask questions about this slide. The AI Tutor explains concepts based on your professor&apos;s material.
                  </p>

                  {/* Suggestion Chips */}
                  <div className="space-y-1.5 pt-2">
                    {[
                      "Can you explain this slide in simple terms?",
                      "Give me a real-world example of this.",
                      "What is the key takeaway here?",
                    ].map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleAskQuestion(sug)}
                        className="w-full text-left p-2 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 transition"
                      >
                        💡 {sug}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.sender === "user" ? "You" : "AI Tutor"} · Slide #{msg.slideNumber}
                    </span>
                  </div>
                ))
              )}
              {isAsking && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Thinking...</span>
                </div>
              )}
            </CardContent>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion();
                }}
                className="flex items-center space-x-2"
              >
                <Input
                  placeholder="Ask a question about this slide..."
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  disabled={isAsking}
                  className="text-xs h-9"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAsking || !questionInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-3"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
