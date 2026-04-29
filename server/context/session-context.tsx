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
};
const initialSessionContext: SessionContextType = {
  code: 0,
  hasQuestion: false,
  isLoading: false,
  hasError: false,
  errorMsg: "",

  questions: [],
  currentQuestionId: null,
};
const SessionContext = createContext<SessionContextType>(initialSessionContext);

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
    <SessionContext value={sessionContext}>
      <SessionDispatchContext value={dispatch}>
        {children}
      </SessionDispatchContext>
    </SessionContext>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export function useSessionDispatch() {
  return useContext(SessionDispatchContext);
}

type DispatchEvents =
  | { type: "UpdateCode"; value: number }
  | { type: "SetError"; value: Error }
  | { type: "SetIsLoading"; value: boolean }
  | {
      type: "FetchedQuestionWithId";
      value: { id: string; question: QuestionWithChosenAnswer };
    };
function sessionReducer(
  session: SessionContextType,
  action: DispatchEvents,
): SessionContextType {
  switch (action.type) {
    case "SetIsLoading": {
      return {
        ...session,
        isLoading: action.value,
      };
    }
    case "FetchedQuestionWithId": {
      const newQuestionsList = [...session.questions, action.value.question];
      newQuestionsList.sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const currentQuestionId =
        newQuestionsList[newQuestionsList.length - 1].id;

      return {
        ...session,
        questions: newQuestionsList,
        currentQuestionId,
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
  }
}
