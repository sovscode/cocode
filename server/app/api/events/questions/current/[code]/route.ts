import {createEventSubscriptionResponse} from "@/lib/emit";

export const dynamic = "force-dynamic"; // Force Next.js to never cache this route

/*
Subscribe to events about the currently active question, attached to a session with code `code`, being updated.
 */
export async function GET(
    request: Request,
    {params}: { params: Promise<{ code: string }> }, // Next.js 15+ async params
) {
    const {code} = await params;
    const eventId = `update-question-for-code:${code}`;
    return createEventSubscriptionResponse(eventId, request)
}
