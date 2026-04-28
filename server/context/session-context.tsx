import { createContext, useContext, useReducer } from "react";

import { Prisma } from "@/lib/generated/prisma/client";
import { toast } from "sonner";

type SessionContextType = {
  isLoading: boolean;
  hasError: boolean;
  errorMsg: string | undefined;
  code: number;
  isOpen: boolean;
  hasQuestion: boolean;
  statedQuestion: QuestionWithChosenAnswer | null;
  beforeEditableRegion: string;
  afterEditableRegion: string;
  hasChosenAnswer: boolean;
  statedQuestionContent: string;
  chosenAnswerContent: string;
  userAnswerContent: string;
};
const initialSessionContext: SessionContextType = {
  isLoading: false,
  hasError: false,
  errorMsg: undefined,
  code: 0,
  isOpen: false,
  hasQuestion: false,
  statedQuestion: null,
  beforeEditableRegion: "",
  afterEditableRegion: "",
  hasChosenAnswer: false,
  statedQuestionContent: "",
  userAnswerContent: "",
  chosenAnswerContent: "",
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
 * Exposes context of type: SessionContextType.
 * Internal state is of type: Session.
 */
export function SessionProvider({ code, children }: SessionProviderProps) {
  const [sessionContext, dispatch] = useReducer(
    sessionReducer,
    initialSessionContext,
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
  | { type: "SetIsLoading"; value: boolean }
  | { type: "UpdateUserChanges"; value: string }
  | { type: "UpdateCurrentQuestion"; value: QuestionWithChosenAnswer }
  | { type: "UpdateCode"; value: number }
  | { type: "SetError"; value: Error };
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
    case "UpdateUserChanges": {
      return {
        ...session,
        userAnswerContent: action.value,
      };
    }
    case "UpdateCurrentQuestion": {
      const contentSplit = action.value.content.split("\n");
      const before = contentSplit.slice(0, action.value.fromLine).join("\n");
      const content = contentSplit
        .slice(action.value.fromLine, action.value.toLine)
        .join("\n");
      const after = contentSplit.slice(action.value.toLine).join("\n");
      return {
        ...session,
        statedQuestion: action.value,
        beforeEditableRegion: before,
        statedQuestionContent: content,
        afterEditableRegion: after,
        isLoading: false,
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
