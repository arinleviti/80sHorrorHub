// Any file named middleware.ts at your project root automatically runs before every matching request hits your actual routes, 
// simply because it's exported as a function called middleware
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/release/")) {
    return new NextResponse("Gone", { status: 410 });
  }
  return NextResponse.next();
}

//The matcher config is what scopes it, though — without that, it would run on literally every request to your site 
export const config = {
  matcher: "/release/:path*",
};