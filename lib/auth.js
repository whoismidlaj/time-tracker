import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyUser, createOAuthUser, getUserById } from "@/db/queries.js";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await verifyUser(credentials.email, credentials.password);
        if (!user) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.display_name,
          image: user.avatar_url,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        if (!profile?.email) return false;
        // Automatically links accounts by email
        const dbUser = await createOAuthUser(profile.email, profile.name, profile.picture);
        user.id = String(dbUser.id);
        user.name = dbUser.display_name;
        user.image = dbUser.avatar_url;
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
      }
      if (trigger === "update" && session) {
        const dbUser = await getUserById(Number(token.id));
        token.name = dbUser.display_name;
        token.picture = dbUser.avatar_url;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.image = token.picture;
        // Aliases for compatibility with existing components
        session.user.display_name = token.name;
        session.user.avatar_url = token.picture;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days default
  },
  pages: {
    signIn: "/", // Redirect to home/login page
  },
  secret: process.env.NEXTAUTH_SECRET,
};
