import API from "./api";

export async function safeGet<T = any>(url: string): Promise<T | null> {
  try {
    const res = await API.get<T>(url);
    return res.data as T;
  } catch (err) {
    // kalau null berarti sudah di-handle 401
    if (err === null) return null;
    throw err; // kalau error lain (500, 404, dll) lemparkan ke komponen
  }
}

export async function safePost<T = any>(url: string, body: any): Promise<T | null> {
  try {
    const res = await API.post<T>(url, body);
    return res.data as T;
  } catch (err) {
    if (err === null) return null;
    throw err;
  }
}

export async function safePut<T = any>(url: string, body: any): Promise<T | null> {
  try {
    const res = await API.put<T>(url, body);
    return res.data as T;
  } catch (err) {
    if (err === null) return null;
    throw err;
  }
}

export async function safeDelete<T = any>(url: string): Promise<T | null> {
  try {
    const res = await API.delete<T>(url);
    return res.data as T;
  } catch (err) {
    if (err === null) return null;
    throw err;
  }
}
