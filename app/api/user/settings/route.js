import { getUserIdFromRequest } from "@/lib/api-utils.js";
import { getUserById, updateUserSettings, getUserSettings } from "@/db/queries.js";
import syncEvents from "@/lib/sync-events.js";

export async function GET(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserById(Number(userId));
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    const settings = getUserSettings(user);
    return Response.json({ settings });

  } catch (err) {
    console.error('GET settings error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return Response.json({ error: 'Invalid settings' }, { status: 400 });
    }

    const updatedSettings = await updateUserSettings(Number(userId), settings);
    
    // Broadcast settings update to other devices
    syncEvents.broadcastSettings(Number(userId), { settings: updatedSettings });

    return Response.json({ settings: updatedSettings });

  } catch (err) {
    console.error('PATCH settings error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
