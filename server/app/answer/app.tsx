"use client";

import Answer from "../components/answer";
import SessionFetcher from "../components/session-fetcher";
import { SessionProvider } from "@/context/session-context";
export default function App({ code }: { code: number }) {
  return (
    <SessionProvider code={code}>
      {/* SessionFetcher only renders it's children if a session could be fetched */}
      <SessionFetcher>
        <Answer />
      </SessionFetcher>
    </SessionProvider>
  );
}
