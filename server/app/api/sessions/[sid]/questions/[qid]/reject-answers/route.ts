import { NextRequest, NextResponse } from "next/server";

import { emitter } from "@/lib/eventEmitter";
import { prisma } from "@/lib/prisma";
import { setAcceptedQuestionScheme } from "@/types/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sid: string; qid: string }> },
) {
  try {
    const { sid: sessionId, qid: questionId } = await params;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Missing sessionId or questionId" },
        { status: 400 },
      );
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, sessionId: true },
    });

    if (!question || question.sessionId !== sessionId) {
      return NextResponse.json(
        { error: "Question not found for this session" },
        { status: 404 },
      );
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        isOpen: false,
        chosenAnswer: { disconnect: true },
      },
    });
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    emitter.emit(`update-question-for-code:${session.code}`, {
      message: "reject-answers",
    });

    return NextResponse.json({}, { status: 200 });
  } catch (error) {
    console.error("question POST error", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: "Failed to delete answer", message },
      { status: 500 },
    );
  }
}
