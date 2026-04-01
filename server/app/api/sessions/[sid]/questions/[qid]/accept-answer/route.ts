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

    const parseResult = setAcceptedQuestionScheme.safeParse(
      await req.json().catch(() => null),
    );
    if (!parseResult.success) {
      console.log("Invalid request body:", parseResult.error);
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.format(),
        },
        { status: 400 },
      );
    }
    const answerId = parseResult.data.acceptedAnswerId;

    if (!sessionId || !questionId || !answerId) {
      return NextResponse.json(
        { error: "Missing sessionId, questionId, or acceptedAnswerId" },
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

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: { id: true, questionId: true },
    });

    if (!answer || answer.questionId !== questionId) {
      return NextResponse.json(
        { error: "Answer not found for this question" },
        { status: 404 },
      );
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        isOpen: false,
        chosenAnswer: { connect: { id: answerId } },
      },
    });
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    emitter.emit(`update-question-for-code:${session.code}`, {
      message: "accept-answer",
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
