import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_BASE_PATH,
  ADMIN_COOKIE_NAME,
  ADMIN_PANEL_PATH,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
} from "@/lib/constants";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === "ok";
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect(ADMIN_BASE_PATH);
  }
}

export async function loginAdmin(username: string, password: string) {
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return true;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function redirectIfAdmin() {
  if (await isAdminAuthenticated()) {
    redirect(ADMIN_PANEL_PATH);
  }
}
