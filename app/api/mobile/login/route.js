import { verifyUser } from "@/db/queries.js";
import { sign } from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await verifyUser(email, password);
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate a simple JWT for mobile auth
    // Note: In a production app, use a more robust strategy.
    // We'll use the NEXTAUTH_SECRET if available.
    const secret = process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev";
    const token = sign(
      { 
        id: String(user.id), 
        email: user.email, 
        name: user.display_name 
      }, 
      secret, 
      { expiresIn: "365d" }
    );

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (err) {
    console.error("Mobile login error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
