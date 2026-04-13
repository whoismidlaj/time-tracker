import { createUser } from "@/db/queries.js";
import { sendWelcomeEmail } from "@/lib/mailer.js";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return Response.json({ error: "Email and password are required" }, { status: 400 });
    
    const user = await createUser(email, password);
    
    // Fire and forget welcome email
    sendWelcomeEmail(email).catch(console.error);

    return Response.json({ user: { id: user.id, email: user.email } }, { status: 201 });

  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
