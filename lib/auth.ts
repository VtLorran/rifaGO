import { cookies } from "next/headers";
import { verifyToken, UserPayload } from "@/lib/jwt";

export async function getAuthUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  return await verifyToken(token);
}
