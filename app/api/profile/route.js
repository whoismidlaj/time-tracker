import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.js";
import { updateUser, getUserById } from '@/db/queries.js';

export async function POST(request) {
  try {
    const sessionData = await getServerSession(authOptions);
    if (!sessionData?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = Number(sessionData.user.id);

    const { display_name, avatar_url } = await request.json();
    const updatedUser = await updateUser(Number(userId), { display_name, avatar_url });


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
