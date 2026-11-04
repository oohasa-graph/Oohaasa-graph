import NextAuth from "next-auth";

import { authOptions } from "@/auth/auth-options";
import { isAuthEnabled } from "@/auth/enabled";

export const runtime = "nodejs";

const handler = NextAuth(authOptions);

function guarded(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  return isAuthEnabled() ? handler(request, context) : new Response(null, { status: 404 });
}

export { guarded as GET, guarded as POST };
