import { OAuth2Client } from 'google-auth-library';
import { createOAuthUser } from '@/db/queries.js';
import { sign } from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return Response.json({ error: 'idToken is required' }, { status: 400 });
    }

    // Verify the Google ID token using the web client ID
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return Response.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    // Find or create the user in our database (same logic as OAuth web flow)
    const dbUser = await createOAuthUser(
      payload.email,
      payload.name,
      payload.picture
    );

    // Issue our own JWT so subsequent API calls work the same as email/password login
    const secret = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_dev';
    const token = sign(
      {
        id: String(dbUser.id),
        email: dbUser.email,
        name: dbUser.display_name,
      },
      secret,
      { expiresIn: '365d' }
    );

    return Response.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        avatar_url: dbUser.avatar_url,
      },
      token,
    });
  } catch (err) {
    console.error('Mobile Google auth error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
