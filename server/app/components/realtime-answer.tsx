// components/RealtimeAnswer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Answer from "./answer";

export default function RealtimeAnswer({
  code,
  initialQuestion
}: {
  code: number;
  initialQuestion: any;
}) {
  const prevQuestion = useRef(initialQuestion);
  const [question, setQuestion] = useState(initialQuestion);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // 1. Create a subscription channel
    const channel = supabase
      .channel("realtime-questions")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for INSERTs, UPDATEs, or DELETEs
          schema: "public",
          table: "Question",
        },
        async () => {
          const { data, error } = await supabase
            .rpc("get_latest_question_by_code", { p_code: code })
            .maybeSingle();

          if (error) {
            setError(error.message)
          } else {
            if (JSON.stringify(prevQuestion.current) != JSON.stringify(data)) {
              setQuestion(data);
              prevQuestion.current = data
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, supabase]);

  if (error) {

    return <div>An error occured: {error}</div>;
  }

  return <Answer code={code} question={question} />;
}
