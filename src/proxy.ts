import { NextResponse, type NextRequest } from "next/server";
import { routeForRequest } from "@/tenancy/host";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname, search } = request.nextUrl;
  const route = routeForRequest(host, pathname, process.env.PANEL_HOST ?? "panel.localhost");
  switch (route.kind) {
    case "passthrough":
      return NextResponse.next();
    case "panel":
      if (pathname === "/") return NextResponse.redirect(new URL("/admin", request.url));
      return NextResponse.next();
    case "site":
      return NextResponse.rewrite(new URL(route.rewrite + search, request.url));
    case "notfound":
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
