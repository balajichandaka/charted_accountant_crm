import { NextRequest } from "next/server";
import { getToken } from "@/lib/session";
import { BACKEND_URL } from "@/lib/api";

// Auth-protected proxy: streams an attachment from the backend using the
// session's backend token, so the browser never needs the token directly.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return new Response("Unauthorized", { status: 401 });

  const res = await fetch(`${BACKEND_URL}/api/attachments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok || !res.body) {
    return new Response("Not found", { status: res.status || 404 });
  }

  const headers = new Headers();
  const ct = res.headers.get("content-type");
  const cd = res.headers.get("content-disposition");
  if (ct) headers.set("content-type", ct);
  if (cd) headers.set("content-disposition", cd);

  return new Response(res.body, { status: 200, headers });
}
