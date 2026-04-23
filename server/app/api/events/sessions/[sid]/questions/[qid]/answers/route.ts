import {emitter} from "@/lib/eventEmitter";
import {createEventSubscriptionResponse} from "@/lib/emit";

export const dynamic = "force-dynamic"; // Force Next.js to never cache this route

/*
Subscribe events about answers being posted to the question with id `qid`.
Requires that the provided `sid` (session id) param matches the provided `qid` (question id) param.
 */
export async function GET(
    request: Request,
    {params}: { params: Promise<{ sid: string; qid: string }> },
) {
    const {sid, qid} = await params;
    // TODO: Check that sid matches qid
    const eventId = `answer-to-question:${qid}`;
    return createEventSubscriptionResponse(eventId, request)
}
