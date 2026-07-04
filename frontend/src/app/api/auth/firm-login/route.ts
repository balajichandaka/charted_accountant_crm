import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { loginWithBackend } from "@/lib/backend-auth";
import { firmSlugFromHost } from "@/lib/tenant";

/** Firm login without Server Actions (stable across Docker redeploys). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 400 });
    }

    const firmSlug = firmSlugFromHost(req.headers.get("host"));
    if (!firmSlug) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This sign-in page is not associated with a firm. Use your firm's address (e.g. yourfirm.cafirmops.in).",
        },
        { status: 400 }
      );
    }

    const user = await loginWithBackend(email, password, firmSlug);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const result = await signIn("credentials", {
      email: user.email,
      password: "verified",
      id: user.id,
      name: user.name,
      role: user.role,
      firmId: user.firmId,
      token: Buffer.from(user.backendToken, "utf8").toString("base64url"),
      redirect: false,
    });

    if (result?.error) {
      console.error("[firm-login] signIn failed:", result.error, { firmSlug });
      return NextResponse.json(
        { ok: false, error: "Sign-in failed. Clear cookies and try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[firm-login] error:", error);
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Sign-in failed. Please try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
