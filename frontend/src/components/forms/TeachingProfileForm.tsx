import React from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TeachingProfileData {
  teaching_style: "STEP_BY_STEP" | "CONCEPTUAL" | "EXAMPLE_DRIVEN" | "SUMMARY_FIRST";
  explanation_style: "CONCEPT_FIRST" | "EQUATION_FIRST" | "EXAMPLE_FIRST";
  language: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  preferred_examples: string[];
  response_length: "SHORT" | "MEDIUM" | "DETAILED";
  tone: "FORMAL" | "FRIENDLY" | "ENCOURAGING";
  technical_depth: "LOW" | "MEDIUM" | "HIGH";
  additional_instructions: string;
}

export const DEFAULT_TEACHING_PROFILE: TeachingProfileData = {
  teaching_style: "STEP_BY_STEP",
  explanation_style: "CONCEPT_FIRST",
  language: "en",
  difficulty: "INTERMEDIATE",
  preferred_examples: [],
  response_length: "MEDIUM",
  tone: "FRIENDLY",
  technical_depth: "MEDIUM",
  additional_instructions: "",
};

interface TeachingProfileFormProps {
  value: TeachingProfileData;
  onChange: (value: TeachingProfileData) => void;
  disabled?: boolean;
}

export function TeachingProfileForm({
  value,
  onChange,
  disabled = false,
}: TeachingProfileFormProps) {
  const updateField = <K extends keyof TeachingProfileData>(
    field: K,
    val: TeachingProfileData[K]
  ) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="teaching_style" className="text-xs">
            Teaching Style
          </Label>
          <Select
            id="teaching_style"
            value={value.teaching_style}
            onChange={(e) =>
              updateField(
                "teaching_style",
                e.target.value as TeachingProfileData["teaching_style"]
              )
            }
            disabled={disabled}
          >
            <option value="STEP_BY_STEP">Step-by-Step (Structured & Logical)</option>
            <option value="CONCEPTUAL">Conceptual (Big Picture & Principles)</option>
            <option value="EXAMPLE_DRIVEN">Example-Driven (Application First)</option>
            <option value="SUMMARY_FIRST">Summary-First (Overview Then Detail)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="explanation_style" className="text-xs">
            Explanation Style
          </Label>
          <Select
            id="explanation_style"
            value={value.explanation_style}
            onChange={(e) =>
              updateField(
                "explanation_style",
                e.target.value as TeachingProfileData["explanation_style"]
              )
            }
            disabled={disabled}
          >
            <option value="CONCEPT_FIRST">Concept First (Intuition before formula)</option>
            <option value="EQUATION_FIRST">Equation First (Math before explanation)</option>
            <option value="EXAMPLE_FIRST">Example First (Concrete case before abstraction)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="difficulty" className="text-xs">
            Difficulty Level
          </Label>
          <Select
            id="difficulty"
            value={value.difficulty}
            onChange={(e) =>
              updateField("difficulty", e.target.value as TeachingProfileData["difficulty"])
            }
            disabled={disabled}
          >
            <option value="BEGINNER">Beginner (Foundational)</option>
            <option value="INTERMEDIATE">Intermediate (Undergraduate standard)</option>
            <option value="ADVANCED">Advanced (Graduate / In-depth)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tone" className="text-xs">
            Tutor & Narration Tone
          </Label>
          <Select
            id="tone"
            value={value.tone}
            onChange={(e) => updateField("tone", e.target.value as TeachingProfileData["tone"])}
            disabled={disabled}
          >
            <option value="FRIENDLY">Friendly & Accessible</option>
            <option value="FORMAL">Formal & Academic</option>
            <option value="ENCOURAGING">Encouraging & Mentoring</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="technical_depth" className="text-xs">
            Technical Depth
          </Label>
          <Select
            id="technical_depth"
            value={value.technical_depth}
            onChange={(e) =>
              updateField(
                "technical_depth",
                e.target.value as TeachingProfileData["technical_depth"]
              )
            }
            disabled={disabled}
          >
            <option value="LOW">Low (Simplified concepts, minimal formulas)</option>
            <option value="MEDIUM">Medium (Balanced formulas and explanations)</option>
            <option value="HIGH">High (Rigorous derivations and proofs)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="response_length" className="text-xs">
            AI Tutor Response Length
          </Label>
          <Select
            id="response_length"
            value={value.response_length}
            onChange={(e) =>
              updateField(
                "response_length",
                e.target.value as TeachingProfileData["response_length"]
              )
            }
            disabled={disabled}
          >
            <option value="SHORT">Short (Direct & concise)</option>
            <option value="MEDIUM">Medium (Balanced context & answer)</option>
            <option value="DETAILED">Detailed (Comprehensive walkthrough)</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="additional_instructions" className="text-xs">
          Additional Pedagogical Instructions (Optional)
        </Label>
        <Textarea
          id="additional_instructions"
          placeholder="e.g. Always define variables explicitly before deriving equations. Emphasize physical units in all worked examples."
          value={value.additional_instructions}
          onChange={(e) => updateField("additional_instructions", e.target.value)}
          maxLength={1000}
          rows={3}
          disabled={disabled}
        />
        <p className="text-[11px] text-slate-500">
          Max 1,000 characters. Guides both lecture slide generation and AI Teaching Assistant answers.
        </p>
      </div>
    </div>
  );
}
