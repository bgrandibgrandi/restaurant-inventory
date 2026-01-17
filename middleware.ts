export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/items/:path*',
    '/stock/:path*',
    '/stores/:path*',
    '/categories/:path*',
  ],
};
