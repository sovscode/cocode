"use client";

import {
  useCurrentQuestion,
  useCurrentQuestionDispatch,
} from "@/context/current-question-context";
import { useSession, useSessionDispatch } from "@/context/session-context";

import IDE from "./ide";
import Menubar from "./menubar";
import ModeSelect from "./mode-select";
import QuestionsNavigator from "./questions-navigator";
import { toast } from "sonner";
import { useState } from "react";

export type ViewMode = "statedQuestion" | "userAnswer" | "chosenAnswer";

export type IdeProps = {
  before: string;
  content: string;
  after: string;
  readonly: boolean;
  language: string;
};

export default function Answer() {
  const { code, hasQuestion } = useSession();
  const sessionDispatch = useSessionDispatch();
  const {
    statedQuestion: question,
    hasAChosenAnswer,
    beforeEditableRegion,
    afterEditableRegion,
    userAnswerContent,
    chosenAnswerContent,
    statedQuestionContent,
    canSubmit,
    isOpen,
  } = useCurrentQuestion();
  const currentQuestionDispatch = useCurrentQuestionDispatch();

  const [viewMode, setViewMode] = useState<ViewMode>("userAnswer");

  let hintMessage = "Edit the code below and submit when you're done.";
  if (hasQuestion && !isOpen) {
    hintMessage = "The question is currently not open for answers.";
  }

  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  if (!sessionDispatch || !currentQuestionDispatch) {
    return;
  }

  const handleSubmit = () => {
    if (!question) return;
    setSubmitting(true);
    fetch(`/api/questions/${question.id}/answers`, {
      method: "POST",
      body: JSON.stringify({ text: userAnswerContent }),
    })
      .then((res) => {
        toast.success("Your submission has been sent to the presenter.", {
          description: "Feel free to post another submission.",
        });
      })
      .catch((err) =>
        window.alert("An error occurred submitting your answer:("),
      )
      .finally(() => {
        setSubmitting(false);
        currentQuestionDispatch({
          type: "DidSubmit",
          value: { content: userAnswerContent },
        });
      });
  };
  const handleReset = () => {
    currentQuestionDispatch({ type: "ResetUserAnswer" });
    setResetKey((key) => key + 1);
  };

  let ideProps: IdeProps = {
    before: beforeEditableRegion,
    content: statedQuestionContent,
    after: afterEditableRegion,
    readonly: true,
    language: question?.language || "javascript",
  };
  switch (viewMode) {
    case "statedQuestion":
      ideProps = {
        ...ideProps,
        content: statedQuestionContent,
        readonly: true,
      };
      break;
    case "chosenAnswer":
      ideProps = { ...ideProps, content: chosenAnswerContent, readonly: true };
      break;
    case "userAnswer":
      ideProps = { ...ideProps, content: userAnswerContent, readonly: !isOpen };
      break;
  }
  function handleContentChange(userAnswer: string): void {
    if (viewMode != "userAnswer") return;
    if (!currentQuestionDispatch) return;
    currentQuestionDispatch({
      type: "UpdateUserAnswer",
      value: { content: userAnswer },
    });
  }

  return (
    <div className="flex flex-col items-stretch justify-center w-full h-screen max-w-5xl gap-2 p-2 mx-auto md:p-4 md:gap-4">
      <Menubar
        code={code}
        submitting={submitting}
        onSubmit={handleSubmit}
        onReset={handleReset}
        canReset={isOpen && userAnswerContent != statedQuestionContent}
        canSubmit={canSubmit}
      />
      <div className="flex items-center justify-center h-[calc(100vh-80px)] w-full">
        <div className="border border-zinc-100 rounded-xl overflow-hidden w-full h-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white">
          <div className="p-2 flex justify-between items-center">
            <ModeSelect
              hasAChosenAnswer={hasAChosenAnswer}
              viewMode={viewMode}
              onViewModeChange={(viewMode: ViewMode) => setViewMode(viewMode)}
            ></ModeSelect>
            <QuestionsNavigator />
          </div>

          <p className="p-4 text-center border-b text-slate-400">
            {hintMessage}
          </p>

          {question ? (
            <IDE
              key={resetKey}
              before={ideProps.before}
              content={ideProps.content}
              after={ideProps.after}
              readonly={ideProps.readonly}
              language={ideProps.language}
              onContentChange={handleContentChange}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-slate-400">
                Waiting for the presenter to post a question ...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
