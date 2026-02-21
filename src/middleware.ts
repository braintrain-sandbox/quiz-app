export { default } from 'next-auth/middleware';

// Protect these routes - redirect to signin if not authenticated
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/quiz/:path*',
    '/api/progress',
    '/api/quiz/:path*',
  ],
};
