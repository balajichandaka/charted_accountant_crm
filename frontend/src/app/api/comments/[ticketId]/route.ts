import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { BACKEND_URL } from "@/lib/api";

// Route Handler instead of a Server Action so that multipart uploads
// (text + files) have no body-size limit and no serialization boundary.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const token = await getToken();
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Forward the raw multipart body to the backend as-is.
  // Content-Type MUST be forwarded — it carries the multipart boundary that multer needs.
  const contentType = req.headers.get("content-type");
  const res = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { "content-type": contentType } : {}),
    },
    body: req.body,
    // Required in Node.js 18+ to allow streaming the request body through.
    // @ts-expect-error duplex is a valid fetch option in Node 18+
    duplex: "half",
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
