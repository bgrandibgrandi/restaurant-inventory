import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Check if user exists (either they signed up before or were invited)
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { account: true },
        });

        if (dbUser) {
          // User exists - update their profile info from Google if needed
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name || dbUser.name,
              image: user.image || dbUser.image,
            },
          });
        } else {
          // New user - create account and user
          const newAccount = await prisma.account.create({
            data: {
              name: user.name ? `${user.name}'s Restaurant` : 'My Restaurant',
              baseCurrency: 'EUR',
            },
          });

          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              accountId: newAccount.id,
            },
            include: { account: true },
          });
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Fetch user with account info
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email || '' },
          include: { account: true },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.accountId = dbUser.accountId;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
