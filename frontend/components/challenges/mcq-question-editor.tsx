"use client";

import { Plus, Trash } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n/context";

export interface MCQQuestionDraft {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

function emptyQuestion(): MCQQuestionDraft {
  return { id: crypto.randomUUID(), prompt: "", options: ["", "", "", ""], correctIndex: 0 };
}

export function newMCQQuestion() {
  return emptyQuestion();
}

/** Builds/edits a bank of multiple-choice questions - each question has 4
 * options with a single correct one, marked with a radio button. Used by the
 * employer-facing Create Skill Test page. */
export function MCQQuestionEditor({
  questions,
  onChange,
}: {
  questions: MCQQuestionDraft[];
  onChange: (next: MCQQuestionDraft[]) => void;
}) {
  const t = useTranslations();

  const updateQuestion = (id: string, patch: Partial<MCQQuestionDraft>) => {
    onChange(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  };

  const updateOption = (id: string, optionIndex: number, value: string) => {
    const question = questions.find((candidate) => candidate.id === id);
    if (!question) return;
    const options = question.options.map((option, index) => (index === optionIndex ? value : option));
    updateQuestion(id, { options });
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((question) => question.id !== id));
  };

  return (
    <div className="space-y-4">
      {questions.map((question, questionIndex) => (
        <div key={question.id} className="rounded-[var(--sb-radius-md)] border border-[var(--sb-border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--sb-text-faint)]">
              {t("employer.skillTests.questionLabel", { number: questionIndex + 1 })}
            </p>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(question.id)}
                className="text-[var(--sb-text-faint)] hover:text-[var(--sb-danger)]"
                aria-label={t("common.delete")}
              >
                <Trash size={14} />
              </button>
            )}
          </div>

          <Input
            className="mt-2"
            placeholder={t("employer.skillTests.questionPromptPlaceholder")}
            value={question.prompt}
            onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
            required
          />

          <div className="mt-3 space-y-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correctIndex === optionIndex}
                  onChange={() => updateQuestion(question.id, { correctIndex: optionIndex })}
                  className="h-4 w-4 shrink-0 border-[var(--sb-border)]"
                  aria-label={t("employer.skillTests.markCorrect")}
                />
                <Input
                  className="flex-1"
                  placeholder={t("employer.skillTests.optionPlaceholder", { letter: String.fromCharCode(65 + optionIndex) })}
                  value={option}
                  onChange={(event) => updateOption(question.id, optionIndex, event.target.value)}
                  required
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--sb-text-faint)]">{t("employer.skillTests.markCorrectHint")}</p>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...questions, emptyQuestion()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--sb-radius-md)] border border-dashed border-[var(--sb-border-strong)] py-2.5 text-xs font-medium text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)]"
      >
        <Plus size={14} /> {t("employer.skillTests.addQuestion")}
      </button>
    </div>
  );
}
