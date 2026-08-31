import type { Request, Response } from "express";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { requestOriginIsWordAddin } from "./origins";
import { supabaseSessionConfiguration } from "./runtimeConfig";

const AUTH_COOKIE_BASE_NAME = "accelerate-session";
/**
 * The session cookie was renamed with the product. Renaming it outright would
 * have signed every existing user out, so incoming requests still accept the
 * old base name and are migrated onto the new one transparently: `getAll`
 * presents legacy cookies under the current name, Supabase writes the refreshed
 * session back under the current name, and `clearRequestAuthCookies` clears
 * both. Remove once no live session predates the rename.
 */
const LEGACY_AUTH_COOKIE_BASE_NAME = "mike-session";

function authConfiguration() {
  const { url, key } = supabaseSessionConfiguration();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) must be set",
    );
  }
  return { url, key };
}

export function authCookiesAreSecure(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV === "production";
}

export function authCookieName(env: NodeJS.ProcessEnv = process.env): string {
  return `${authCookiesAreSecure(env) ? "__Host-" : ""}${AUTH_COOKIE_BASE_NAME}`;
}

export function legacyAuthCookieName(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `${authCookiesAreSecure(env) ? "__Host-" : ""}${LEGACY_AUTH_COOKIE_BASE_NAME}`;
}

/**
 * Present the request's auth cookies under the current base name, mapping any
 * that still carry the legacy base. A cookie already stored under the current
 * name always wins, so a half-migrated browser cannot resurrect a stale
 * session.
 */
function authStorageCookies(req: Request): { name: string; value: string }[] {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const baseName = authCookieName();
  const legacyBaseName = legacyAuthCookieName();
  if (baseName === legacyBaseName) return cookies;

  const present = new Set(cookies.map(({ name }) => name));
  return cookies.flatMap(({ name, value }) => {
    if (!belongsToAuthStorage(name, legacyBaseName)) {
      return [{ name, value: value ?? "" }];
    }
    const migrated = baseName + name.slice(legacyBaseName.length);
    return present.has(migrated) ? [] : [{ name: migrated, value: value ?? "" }];
  });
}

function appendCookie(
  res: Response,
  name: string,
  value: string,
  options: CookieOptions,
) {
  res.append("Set-Cookie", serializeCookieHeader(name, value, options));
}

function requestCookieOptions(
  req: Request,
): Pick<
  CookieOptions,
  "httpOnly" | "secure" | "sameSite" | "path" | "partitioned"
> {
  const wordAddin = requestOriginIsWordAddin(req.get("origin"));
  return {
    httpOnly: true,
    secure: wordAddin || authCookiesAreSecure(),
    sameSite: wordAddin ? "none" : "lax",
    path: "/",
    partitioned: wordAddin || undefined,
  };
}

function belongsToAuthStorage(name: string, baseName: string): boolean {
  return (
    name === baseName ||
    name.startsWith(`${baseName}.`) ||
    name.startsWith(`${baseName}-`)
  );
}

export function clearRequestAuthCookies(req: Request, res: Response): void {
  const baseName = authCookieName();
  const legacyBaseName = legacyAuthCookieName();
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieOptions = requestCookieOptions(req);
  for (const { name } of cookies) {
    if (
      !belongsToAuthStorage(name, baseName) &&
      !belongsToAuthStorage(name, legacyBaseName)
    ) {
      continue;
    }
    appendCookie(res, name, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });
  }
  res.setHeader(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
}

/**
 * Creates an isolated Supabase client for one HTTP request. Session and PKCE
 * state are stored only in server-set HttpOnly cookies; no browser Supabase
 * client is involved.
 */
export function createRequestSupabase(
  req: Request,
  res: Response,
): SupabaseClient {
  const { url, key } = authConfiguration();
  const cookieOptions = requestCookieOptions(req);
  return createServerClient(url, key, {
    cookieOptions: {
      name: authCookieName(),
      ...cookieOptions,
    },
    cookies: {
      getAll() {
        return authStorageCookies(req);
      },
      setAll(cookiesToSet, responseHeaders) {
        for (const { name, value, options } of cookiesToSet) {
          appendCookie(res, name, value, {
            ...options,
            ...cookieOptions,
          });
        }
        for (const [name, value] of Object.entries(responseHeaders)) {
          res.setHeader(name, value);
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

export interface PublicAuthUser {
  id: string;
  email: string;
  pendingEmail: string | null;
  createdWithGoogle: boolean;
}

export function publicAuthUser(user: User): PublicAuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    pendingEmail: user.new_email ?? null,
    createdWithGoogle: user.app_metadata?.provider === "google",
  };
}
