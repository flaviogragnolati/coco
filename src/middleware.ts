import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const fullUrl = request.nextUrl.href;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  response.headers.set("x-full-url", fullUrl);

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"], // exclude _next, favicon,api
};
