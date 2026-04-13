import { getUserIdFromRequest, getUserStatus } from "@/lib/api-utils.js";
import syncEvents from "@/lib/sync-events.js";

export async function GET(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // 1. Send initial status immediately on connect
      try {
        const initialStatus = await getUserStatus(userId);
        sendEvent('status-update', initialStatus);
      } catch (err) {
        console.error('SSE Initial data error:', err);
      }

      // 2. Listen for real-time updates from our broadcast engine
      const onStatusUpdate = (data) => sendEvent('status-update', data);
      const onSettingsUpdate = (data) => sendEvent('settings-update', data);

      syncEvents.on(`status-update:${userId}`, onStatusUpdate);
      syncEvents.on(`settings-update:${userId}`, onSettingsUpdate);

      // 3. Keep-Alive Heartbeat every 20s to prevent VPS timeouts
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 20000);

      // 4. Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        syncEvents.off(`status-update:${userId}`, onStatusUpdate);
        syncEvents.off(`settings-update:${userId}`, onSettingsUpdate);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
