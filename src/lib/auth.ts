import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/app/services/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  session: { strategy: "database" },

  /* events: {
    // Fixes 'null' emailVerified for Google users
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  }, */
events: {
  async linkAccount({ user }) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const pendingConsent = cookieStore.get("pendingConsent");

    let consentPrivacy = false;
    let consentNewsletter = false;

    if (pendingConsent) {
      try {
        ({ consentPrivacy, consentNewsletter } = JSON.parse(pendingConsent.value));
      } catch (e) {
        console.error("Failed to parse consent cookie", e);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        consentPrivacy,
        consentNewsletter,
      },
    });
  },
},
  callbacks: {
    // Add user info + consent to session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.name = user.name;
        session.user.consentPrivacy = user.consentPrivacy ?? false;
        session.user.consentNewsletter = user.consentNewsletter ?? false;
      }
      return session;
    },

    // Sign-in callback
    async signIn({ user, account }) {
  if (account?.provider === "google") {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    // If user exists and hasn't consented, block login
    if (dbUser && !dbUser.consentPrivacy) {
      return false; // login blocked
    }
  }

  return true; // allow login otherwise
},
  },
};