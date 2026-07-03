import jwt from "jsonwebtoken";

const RAW_SECRET = process.env.JWT_SECRET ?? process.env.AUTH_SECRET;
if (!RAW_SECRET) {
  throw new Error(
    "JWT_SECRET (or AUTH_SECRET) must be set. Refusing to start without a signing secret."
  );
}
const SECRET: string = RAW_SECRET;
const EXPIRES_IN = "7d";

export type JwtPayload = {
  sub: string;
  role: "CA" | "MANAGER" | "EMPLOYEE";
  name: string;
  email: string;
  /** Firm (tenant) id this token is scoped to. */
  firm: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
