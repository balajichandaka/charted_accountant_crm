import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? "change-me";
const EXPIRES_IN = "7d";

export type JwtPayload = {
  sub: string;
  role: "CA" | "EMPLOYEE";
  name: string;
  email: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
