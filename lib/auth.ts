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
      console.log('[Auth] signIn callback started for:', user.email);

      if (!user.email) {
        console.error('[Auth] No email provided');
        return false;
      }

      try {
        // Check if user exists (either they signed up before or were invited)
        console.log('[Auth] Checking for existing user...');
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { account: true },
        });

        if (dbUser) {
          console.log('[Auth] User found, updating profile...');
          // User exists - update their profile info from Google if needed
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name || dbUser.name,
              image: user.image || dbUser.image,
            },
          });
          console.log('[Auth] Profile updated successfully');
        } else {
          console.log('[Auth] New user, creating account...');
          // New user - create account and user
          const newAccount = await prisma.account.create({
            data: {
              name: user.name ? `${user.name}'s Restaurant` : 'My Restaurant',
              baseCurrency: 'EUR',
            },
          });
          console.log('[Auth] Account created:', newAccount.id);

          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              accountId: newAccount.id,
            },
            include: { account: true },
          });
          console.log('[Auth] User created:', dbUser.id);
        }

        console.log('[Auth] signIn successful');
        return true;
      } catch (error) {
        console.error('[Auth] Error in signIn callback:', error);
        console.error('[Auth] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
