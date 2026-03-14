import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sid: string; qid: string; aid: string }> }) {
  const supabase = createClient(await cookies())
  const { sid, qid, aid } = await params
  const sessionId = parseInt(sid)
  const questionId = parseInt(qid)
  const answerId = parseInt(aid)

  const { error } = await supabase
    .rpc("delete_answer", { sid_param: sessionId, qid_param: questionId, aid_param: answerId })

  if (error !== null) {
    console.error("Supabase error", error)
    return NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 })
}
