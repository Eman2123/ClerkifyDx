import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { config } from "./config.js";
import { exec, queryOne } from "./db.js";
import { newId } from "./store.js";

export type Role = "student" | "intern" | "patient" | "doctor" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

if (config.isProd && config.jwtSecret === "dev-only-secret-change-me") {
  throw new Error("JWT_SECRET must be set in production");
}

// Admins are never self-registered.
export const registerSchema = z.object({
  email: z.string().email().max(200).transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  role: z.enum(["student", "intern", "patient", "doctor"]),
});
export const loginSchema = z.object({ email: z.string().email().transform((s) => s.toLowerCase()), password: z.string().min(1) });

const sign = (u: AuthUser) => jwt.sign({ sub: u.id }, config.jwtSecret, { expiresIn: "7d" });

type UserRow = { id: string; email: string; name: string; role: Role; verified: number; password_hash: string };
const toUser = (r: UserRow): AuthUser => ({ id: r.id, email: r.email, name: r.name, role: r.role, verified: !!r.verified });

export async function register(input: z.infer<typeof registerSchema>) {
  const exists = await queryOne("SELECT 1 AS x FROM users WHERE email = $1", [input.email]);
  if (exists) return null;
  const id = newId();
  // Doctors stay unverified until an admin checks their registration (MDCN).
  try {
    await exec("INSERT INTO users (id,email,name,password_hash,role,verified,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [
      id, input.email, input.name, await bcrypt.hash(input.password, 10), input.role, 0, Date.now(),
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return null; // unique violation: email registered at the same moment
    throw e;
  }
  const user: AuthUser = { id, email: input.email, name: input.name, role: input.role, verified: false };
  return { user, token: sign(user) };
}

export async function login(email: string, password: string) {
  const row = await queryOne<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  // Constant-ish behaviour: always run a compare.
  const hash = row?.password_hash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi";
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) return null;
  const user = toUser(row);
  return { user, token: sign(user) };
}

async function userFromRequest(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string };
    const row = await queryOne<UserRow>("SELECT * FROM users WHERE id = $1", [payload.sub]);
    return row ? toUser(row) : null;
  } catch {
    return null;
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = (await userFromRequest(req)) ?? undefined;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userFromRequest(req);
      if (!user) return res.status(401).json({ error: "Please log in" });
      if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: "Not allowed for your role" });
      req.user = user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Creates the first admin from env vars (admins can never self-register). */
export async function seedAdmin() {
  if (!config.adminEmail || !config.adminPassword) return;
  const row = await queryOne("SELECT id FROM users WHERE email = $1", [config.adminEmail]);
  if (row) return;
  await exec("INSERT INTO users (id,email,name,password_hash,role,verified,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [
    newId(), config.adminEmail, "Administrator", await bcrypt.hash(config.adminPassword, 10), "admin", 1, Date.now(),
  ]);
  console.log(`Admin account created for ${config.adminEmail}`);
}
