import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/auth/sign-in?expired=1";
        } catch {}
      }
      return Promise.reject(null);
    }
    return Promise.reject(err);
  }
);

export default API;