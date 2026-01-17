import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/stock/:path*',
    '/stores/:path*',
    '/categories/:path*',
    '/users/:path*',
    '/roles/:path*',
  ],
};
