import API from "@/lib/api";

export async function getOverviewData() {
  const res = await API.get("/assets/summary");
  if (!res?.data) throw new Error("Invalid response from server");
  return res.data.data;
}
