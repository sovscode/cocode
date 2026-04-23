import {emitter} from "@/lib/eventEmitter";

export function createEventSubscriptionResponse(eventName: string, request: Request) {
    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
        start(c) {
            controller = c;
            const encoder = new TextEncoder();

            // 1. Send an initial ping to establish connection
            controller.enqueue(
                encoder.encode(
                    `event: connected\ndata: {"status": "subscribed to updates on event: ${eventName}"}\n\n`,
                ),
            );

            // 2. Define the callback that fires when this session is updated
            const onUpdate = (data: { message: string }) => {
                const payload = JSON.stringify(data);
                const encoderInput = `event: ${eventName}\ndata: ${payload}\n\n`;
                console.log("Going to enqueue:", encoderInput)
                controller.enqueue(
                    encoder.encode(
                        encoderInput,
                    ),
                );
            };

            // 3. Listen only to events for this specific session id
            emitter.on(eventName, onUpdate);

            // 4. Handle client disconnects to prevent memory leaks
            request.signal.addEventListener("abort", () => {
                emitter.off(eventName, onUpdate);
                console.log(`Client disconnected from event ${eventName}`);
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
