import { useSession, useSessionDispatch } from "@/context/session-context";

import { Button } from "@/components/ui/button";
import { useCurrentQuestion } from "@/context/current-question-context";

export default function QuestionsNavigator() {
  const sessionContext = useSession();
  const { statedQuestion } = useCurrentQuestion();
  const sessionDispatch = useSessionDispatch();
  if (!sessionDispatch) return;
  return (
    <div className="flex items-center justify-center gap-2">
      <p>
        Questions ({sessionContext.currentQuestionId}/
        {sessionContext.questions.length}):
      </p>
      <div className="cursor-pointer">
        <Button
          variant={"outline"}
          disabled={!sessionContext.hasPreviousQuestion}
          onClick={() => sessionDispatch({ type: "PreviousQuestion" })}
        >
          Previous
        </Button>
        <Button
          variant={"outline"}
          disabled={!sessionContext.hasNextQuestion}
          onClick={() => sessionDispatch({ type: "NextQuestion" })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
