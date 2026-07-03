import jwt from "jsonwebtoken";

// Platform (super-admin) tokens are signed/verified separately from firm tokens.
// The `kind: "platform"` discriminator + a dedicated secret ensure a firm token
// can never be accepted as a platform token or vice-versa.
const RAW_SECRET =
  process.env.PLATFORM_JWT_SECRET ?? process.env.JWT_SECRET ?? process.env.AUTH_SECRET;
if (!RAW_SECRET) {
  throw new Error(
    "PLATFORM_JWT_SECRET (or JWT_SECRET/AUTH_SECRET) must be set for platform auth."
  );
}
const SECRET: string = RAW_SECRET;
const EXPIRES_IN = "7d";

export type PlatformJwtPayload = {
  sub: string;
  email: string;
  name: string;
  kind: "platform";
};

export function signPlatformToken(payload: Omit<PlatformJwtPayload, "kind">): string {
  return jwt.sign({ ...payload, kind: "platform" }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyPlatformToken(token: string): PlatformJwtPayload {
  const decoded = jwt.verify(token, SECRET) as PlatformJwtPayload;
  if (decoded.kind !== "platform") {
    throw new Error("Not a platform token");
  }
  return decoded;
}
