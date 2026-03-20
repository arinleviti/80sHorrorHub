import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/app/services/prisma";

//The full configuration of your authentication system (NextAuth)
export const authOptions: NextAuthOptions = {
    //Store users and sessions in my database using Prisma
    //When you need to save users, sessions, accounts → use this Prisma client.
  adapter: PrismaAdapter(prisma),
  providers: [
    //Users can log in with Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  //Sessions are stored in your DB, not just in cookies
  session: {
    strategy: "database",
  },
   callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role; // 🔥 required for admin logic
      }
      return session;
    },
  },
};