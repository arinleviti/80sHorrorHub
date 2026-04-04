import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "MODERATOR" | "ADMIN";
      name?: string | null;
      email?: string | null;
      image?: string | null;
      consentPrivacy: boolean;
      consentNewsletter: boolean;
    };
  }

  interface User {
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
    consentPrivacy: boolean;
    consentNewsletter: boolean;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
    consentPrivacy: boolean;
    consentNewsletter: boolean;
  }
}