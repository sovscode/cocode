import { act, createContext, useContext, useReducer } from "react";

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
  hasAChosenAnswer: boolean;
  statedQuestionContent: string;
  chosenAnswerContent: string;
  userAnswerContent: string;
  canSubmit: boolean;
  submittedAnswers: string[];
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
  hasAChosenAnswer: false,
  statedQuestionContent: "",
  userAnswerContent: "",
  chosenAnswerContent: "",
  canSubmit: false,
  submittedAnswers: [],
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
  | { type: "SetIsLoading"; value: boolean }
  | { type: "UpdateCurrentQuestion"; value: QuestionWithChosenAnswer }
  | { type: "UpdateUserAnswer"; value: { content: string } }
  | { type: "UpdateChosenAnswer"; value: { content: string } }
  | { type: "UpdateCode"; value: number }
  | { type: "ResetUserAnswer" }
  | { type: "DidSubmit"; value: { content: string } }
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
    case "DidSubmit": {
      const newSubmittedAnswers = [
        ...session.submittedAnswers,
        action.value.content,
      ];
      const canSubmit = decideCanSubmit(
        session.userAnswerContent,
        session.statedQuestionContent,
        newSubmittedAnswers,
        session.isOpen,
      );
      return {
        ...session,
        submittedAnswers: newSubmittedAnswers,
        canSubmit,
      };
    }
    case "ResetUserAnswer": {
      return {
        ...session,
        userAnswerContent: session.statedQuestionContent,
        canSubmit: false,
      };
    }
    case "UpdateCurrentQuestion": {
      const fromLineIndex = action.value.fromLine - 1;
      const toLineIndex = action.value.toLine - 1;
      const lines = action.value.content.split("\n");
      const before = lines.slice(0, fromLineIndex).join("\n");
      const content = lines.slice(fromLineIndex, toLineIndex).join("\n");
      const after = lines.slice(toLineIndex).join("\n");

      return {
        ...session,
        statedQuestion: action.value,
        beforeEditableRegion: before,
        statedQuestionContent: content,
        afterEditableRegion: after,
        isLoading: false,
        hasQuestion: !!action.value,
        userAnswerContent: content,
        chosenAnswerContent: action.value.chosenAnswer?.text || "",
        hasAChosenAnswer: !!action.value?.chosenAnswer,
        isOpen: action.value.isOpen,
      };
    }

    case "UpdateUserAnswer": {
      const canSubmit = decideCanSubmit(
        action.value.content,
        session.statedQuestionContent,
        session.submittedAnswers,
        session.isOpen,
      );

      return {
        ...session,
        userAnswerContent: action.value.content,
        canSubmit,
      };
    }
    case "UpdateChosenAnswer": {
      return {
        ...session,
        chosenAnswerContent: action.value.content,
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
