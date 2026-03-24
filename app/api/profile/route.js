import { updateUser, getUserById } from '../../../db/queries.js';

function parseCookie(req) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(request) {
  try {
    const userId = parseCookie(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { display_name, avatar_url } = await request.json();
    const updatedUser = updateUser(Number(userId), { display_name, avatar_url });

    return Response.json({ 
      user: { 
        id: updatedUser.id, 
        email: updatedUser.email,
        display_name: updatedUser.display_name,
        avatar_url: updatedUser.avatar_url
      } 
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
