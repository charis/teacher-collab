// Library imports
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Without a defined matcher, the following line applies next-auth
// to the entire project
//export { default } from 'next-auth/middleware';

// middleware is applied to all routes, use conditionals to select


// Applies next-auth only to matching routes - can be regex
// Ref: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
    matcher: [
        // Login / Signup: Must be logged out to view these
        '/auth/:path*',
    ]
};

export async function proxy(request: NextRequest) {
    const isAuthenticated = await getToken({ req: request }) !== null;
    const path = request.nextUrl.pathname;
    
    // Redirect to homepage if authenticated and trying to access '/auth' paths
    if (path.startsWith('/auth') && isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.nextUrl));
    }
    
    // Redirect to sign-in page if not authenticated and trying to access the homepage
    if (path === '/' && !isAuthenticated) {
        return NextResponse.redirect(new URL('/auth', request.nextUrl));
    }
};