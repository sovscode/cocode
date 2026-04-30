"use client";

import { createContext, useContext, useReducer } from "react";

import { Prisma } from "@/lib/generated/prisma/client";
import { toast } from "sonner";

type SessionContextType = {
  code: number;
  hasQuestion: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMsg: string | undefined;

  questions: QuestionWithChosenAnswer[]; // Should not be visible to users of context
  currentQuestionId: string | null;
  hasPreviousQuestion: boolean;
  hasNextQuestion: boolean;
};
const initialSessionContext: SessionContextType = {
  code: 0,
  hasQuestion: false,
  isLoading: false,
  hasError: false,
  errorMsg: "",

  questions: [],
  currentQuestionId: null,
  hasPreviousQuestion: false,
  hasNextQuestion: false,
};
const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SessionDispatchContext =
  createContext<React.Dispatch<DispatchEvents> | null>(null);

export type QuestionWithChosenAnswer = Prisma.QuestionGetPayload<{
  include: { chosenAnswer: true };
}>;

interface SessionProviderProps {
  code: number;
  children: React.ReactNode;
}
/**
 * Fetches questions and controls which question is currently active
 */
export function SessionProvider({ code, children }: SessionProviderProps) {
  const initialSessionContextWithCode = { ...initialSessionContext, code };

  const [sessionContext, dispatch] = useReducer(
    sessionReducer,
    initialSessionContextWithCode,
  );

  return (
    <SessionContext.Provider value={sessionContext}>
      <SessionDispatchContext.Provider value={dispatch}>
        {children}
      </SessionDispatchContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}

export function useSessionDispatch() {
  return useContext(SessionDispatchContext);
}

type DispatchEvents =
  | { type: "UpdateCode"; value: number }
  | { type: "SetError"; value: Error }
  | { type: "SetIsLoading"; value: boolean }
  | { type: "NextQuestion" }
  | { type: "PreviousQuestion" }
  | {
      type: "FetchedQuestionWithId";
      value: QuestionWithChosenAnswer;
    };
function sessionReducer(
  session: SessionContextType,
  action: DispatchEvents,
): SessionContextType {
  switch (action.type) {
    case "PreviousQuestion": {
      return navigateToQuestionWithOffset(-1, session);
    }
    case "NextQuestion": {
      return navigateToQuestionWithOffset(1, session);
    }
    case "SetIsLoading": {
      return {
        ...session,
        isLoading: action.value,
      };
    }
    case "FetchedQuestionWithId": {
      const existingQuestionIndex = session.questions.findIndex(
        (question) => action.value.id == question.id,
      );
      if (existingQuestionIndex >= 0) {
        const newQuestions = [...session.questions];
        session.questions[existingQuestionIndex] = action.value;
        return { ...session, questions: newQuestions };
      }
      const newQuestionsList = [...session.questions, action.value];
      newQuestionsList.sort((a, b) => {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      let currentQuestionId = session.currentQuestionId;
      const questionsCount = newQuestionsList.length;
      if (!currentQuestionId) {
        if (questionsCount > 0) {
          currentQuestionId = newQuestionsList[questionsCount - 1].id;
        }
      }

      const { hasPreviousQuestion, hasNextQuestion } =
        determineHasPreviousAndNextQuestion(
          newQuestionsList,
          session.currentQuestionId,
        );

      return {
        ...session,
        questions: newQuestionsList,
        currentQuestionId,
        hasPreviousQuestion,
        hasNextQuestion,
      };
    }

    case "UpdateCode": {
      return {
        ...session,
        code: action.value,
      };
    }
    case "SetError": {
      toast(`An error occured: ${action.value}`);
      return {
        ...session,
        errorMsg: action.value.message,
      };
    }
    default: {
      return session;
    }
  }
}

const determineHasPreviousAndNextQuestion = (
  questions: QuestionWithChosenAnswer[],
  currentQuestionId: string | null,
): { hasPreviousQuestion: boolean; hasNextQuestion: boolean } => {
  let hasPreviousQuestion = false;
  let hasNextQuestion = false;
  const currentQuestionIndex = questions.findIndex((question) => {
    return question.id == currentQuestionId;
  });
  if (currentQuestionIndex < 0) return { hasPreviousQuestion, hasNextQuestion };
  hasPreviousQuestion = currentQuestionIndex > 0;
  hasNextQuestion = currentQuestionIndex < questions.length - 1;
  return { hasPreviousQuestion, hasNextQuestion };
};

function navigateToQuestionWithOffset(
  offset: number,
  session: SessionContextType,
) {
  const currentQuestionIndex = session.questions.findIndex((question) => {
    return question.id == session.currentQuestionId;
  });

  if (currentQuestionIndex < 0) return session;

  const newCurrentQuestionId =
    session.questions[currentQuestionIndex + offset].id;

  const { hasPreviousQuestion, hasNextQuestion } =
    determineHasPreviousAndNextQuestion(
      session.questions,
      newCurrentQuestionId,
    );
  return {
    ...session,
    currentQuestionId: newCurrentQuestionId,
    hasPreviousQuestion,
    hasNextQuestion,
  };
}
