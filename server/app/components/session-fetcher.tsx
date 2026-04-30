"use client";

import {
  QuestionWithChosenAnswer,
  useSession,
  useSessionDispatch,
} from "@/context/session-context";

import { Spinner } from "@/components/ui/spinner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fetches the question currently associated to session with code `code` and stores it in the session context.
 * Subscribes to changes regarding the session, so the latest question including associated `question.chosenAnswer` is always fetched live.
 */
export default function SessionFetcher({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionDispatch = useSessionDispatch();
  const { isLoading, code, hasError } = useSession();
  const router = useRouter();

  useEffect(() => {
    function subscribeToQuestions(
      code: number,
      updateQuestionCallback: (code: number) => void,
    ) {
      const url = `/api/events/questions/current/${code}`;
      const sse = new EventSource(url);

      // Listen for the custom 'update-question-for-code' event we defined in our Next.js stream
      sse.addEventListener(`update-question-for-code:${code}`, (event) => {
        const data = JSON.parse(event.data);
        console.log(`Received ping for session with code ${code}:`, data);
        updateQuestionCallback(code);
      });

      // Handle standard connection messages
      sse.addEventListener("connected", (event) => {
        console.log("SSE Connected:", JSON.parse(event.data));
      });

      sse.onerror = (err) => {
        console.error("SSE Error:", err);
        // EventSource will automatically attempt to reconnect, which is awesome.
      };

      return sse; // Return it so you can call sse.close() when the user closes the session
    }
    function updateQuestion(code: number) {
      if (!sessionDispatch) {
        console.error("This component should be wrapped in a SessionProvider");
        return;
      }

      sessionDispatch({
        type: "SetIsLoading",
        value: true,
      });
      fetch(`/api/questions/current/${code}`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
          const latestQuestion: QuestionWithChosenAnswer =
            await response.json();
          if (!latestQuestion) {
            console.error("Failed to fetch latest question.");
          }

          sessionDispatch({
            type: "FetchedQuestionWithId",
            value: latestQuestion,
          });
        })
        .catch(() => {
          sessionDispatch({
            type: "SetError",
            value: Error(`Couldn't join session with code ${code}`),
          });
        })
        .finally(() => {
          sessionDispatch({
            type: "SetIsLoading",
            value: false,
          });
        });
    }
    updateQuestion(code);
    subscribeToQuestions(code, updateQuestion);
  }, [code, sessionDispatch]);

  useEffect(() => {
    if (hasError) {
      router.push("/");
    }
  }, [hasError, router]);

  if (isLoading || hasError) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <Spinner className="w-8 h-8 text-slate-400"></Spinner>
      </div>
    );
  }

  return children;
}
