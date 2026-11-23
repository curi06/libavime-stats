import { type NextRequest } from "next/server";
import { protegerSesionAdmin } from "@/lib/supabase-proxy";

export async function proxy(request: NextRequest) {
  return protegerSesionAdmin(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
