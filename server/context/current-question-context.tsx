"use client";

import { createContext, useContext, useEffect, useReducer } from "react";

import { Prisma } from "@/lib/generated/prisma/client";
import { useSession } from "./session-context";

export type CurrentQuestionContextType = {
  questionId: string;
  statedQuestion: QuestionWithChosenAnswer | null;
  beforeEditableRegion: string;
  afterEditableRegion: string;
  hasAChosenAnswer: boolean;
  statedQuestionContent: string;
  chosenAnswerContent: string;
  userAnswerContent: string;
  canSubmit: boolean;
  submittedAnswers: string[];
  isOpen: boolean;
};
const initialCurrentQuestionContext: CurrentQuestionContextType = {
  questionId: "",
  isOpen: false,
  statedQuestion: null,
  beforeEditableRegion: "",
  afterEditableRegion: "",
  hasAChosenAnswer: false,
  statedQuestionContent: "",
  userAnswerContent: "",
  chosenAnswerContent: "",
  canSubmit: false,
  submittedAnswers: [],
};
const CurrentQuestionContext = createContext<
  CurrentQuestionContextType | undefined
>(undefined);

const CurrentQuestionDispatchContext =
  createContext<React.Dispatch<DispatchEvents> | null>(null);

export type QuestionWithChosenAnswer = Prisma.QuestionGetPayload<{
  include: { chosenAnswer: true };
}>;

interface CurrentQuestionProviderProps {
  children: React.ReactNode;
}
/**
 * Manages the currently active question
 */
export function CurrentQuestionProvider({
  children,
}: CurrentQuestionProviderProps) {
  const sessionContext = useSession();
  const { questions, currentQuestionId } = sessionContext;

  const [currentQuestionContext, dispatch] = useReducer(
    currentQuestionReducer,
    initialCurrentQuestionContext,
  );

  useEffect(() => {
    const currentQuestion = questions.find(
      (question) => question.id == currentQuestionId,
    );
    if (!currentQuestion) return;
    dispatch({ type: "UpdateCurrentQuestion", value: currentQuestion });
  }, [questions, currentQuestionId]);

  return (
    <CurrentQuestionContext.Provider value={currentQuestionContext}>
      <CurrentQuestionDispatchContext.Provider value={dispatch}>
        {children}
      </CurrentQuestionDispatchContext.Provider>
    </CurrentQuestionContext.Provider>
  );
}

export function useCurrentQuestion() {
  const context = useContext(CurrentQuestionContext);
  if (context === undefined) {
    throw new Error(
      "useCurrentQuestion must be used within a CurrentQuestionProvider",
    );
  }

  return context;
}

export function useCurrentQuestionDispatch() {
  return useContext(CurrentQuestionDispatchContext);
}

type DispatchEvents =
  | { type: "UpdateUserAnswer"; value: { content: string } }
  | { type: "UpdateChosenAnswer"; value: { content: string } }
  | { type: "UpdateCurrentQuestion"; value: QuestionWithChosenAnswer | null }
  | { type: "ResetUserAnswer" }
  | { type: "DidSubmit"; value: { content: string } };
function currentQuestionReducer(
  currentQuestion: CurrentQuestionContextType,
  action: DispatchEvents,
): CurrentQuestionContextType {
  switch (action.type) {
    case "UpdateCurrentQuestion": {
      const statedQuestion = action.value;
      console.log(statedQuestion);
      if (!statedQuestion) return currentQuestion;

      const fromLineIndex = statedQuestion.fromLine - 1;
      const toLineIndex = statedQuestion.toLine - 1;
      const lines = statedQuestion.content.split("\n");
      const before = lines.slice(0, fromLineIndex).join("\n");
      const content = lines.slice(fromLineIndex, toLineIndex).join("\n");
      const after = lines.slice(toLineIndex).join("\n");

      return {
        ...initialCurrentQuestionContext,
        statedQuestion: statedQuestion,
        beforeEditableRegion: before,
        statedQuestionContent: content,
        afterEditableRegion: after,
        userAnswerContent: content,
        chosenAnswerContent: statedQuestion.chosenAnswer?.text || "",
        hasAChosenAnswer: !!statedQuestion?.chosenAnswer,
        isOpen: statedQuestion.isOpen,
      };
    }

    case "DidSubmit": {
      const newSubmittedAnswers = [
        ...currentQuestion.submittedAnswers,
        action.value.content,
      ];
      const canSubmit = decideCanSubmit(
        currentQuestion.userAnswerContent,
        currentQuestion.statedQuestionContent,
        newSubmittedAnswers,
        currentQuestion.isOpen,
      );
      return {
        ...currentQuestion,
        submittedAnswers: newSubmittedAnswers,
        canSubmit,
      };
    }
    case "ResetUserAnswer": {
      return {
        ...currentQuestion,
        userAnswerContent: currentQuestion.statedQuestionContent,
        canSubmit: false,
      };
    }

    case "UpdateUserAnswer": {
      const canSubmit = decideCanSubmit(
        action.value.content,
        currentQuestion.statedQuestionContent,
        currentQuestion.submittedAnswers,
        currentQuestion.isOpen,
      );

      return {
        ...currentQuestion,
        userAnswerContent: action.value.content,
        canSubmit,
      };
    }
    case "UpdateChosenAnswer": {
      return {
        ...currentQuestion,
        chosenAnswerContent: action.value.content,
      };
    }
    default: {
      return currentQuestion;
    }
  }
}
function decideCanSubmit(
  currentContent: string,
  statedQuestionContent: string,
  submittedAnswers: string[],
  isOpen: boolean,
) {
  const isPreviouslySubmitted = submittedAnswers.includes(currentContent);
  const isDifferentFromStatedQuestion = currentContent != statedQuestionContent;
  const canSubmit =
    !isPreviouslySubmitted && isDifferentFromStatedQuestion && isOpen;
  return canSubmit;
}
