// src/lib/fetch/overview.ts
import API from "@/lib/api";

/**
 * Fetch overview summary used by OverviewCardsGroup.
 * Uses your existing API axios instance so Authorization header is included
 * after the user signs in (auth-context.tsx sets API.defaults.headers.common.Authorization).
 * See Postman: /assets/summary. :contentReference[oaicite:4]{index=4}
 */
export async function getOverviewData() {
  const res = await API.get("/assets/summary");
  // defensive: response shape in Postman has { data: {...}, meta: {...} }
  if (!res?.data) throw new Error("Invalid response from server");
  return res.data.data;
}
