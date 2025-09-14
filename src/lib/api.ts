import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const skipAuthUrls = ['/login', '/register', '/auth'];

API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const isAuthRequest = skipAuthUrls.some(path => config.url?.includes(path));
    
    if (token && config.headers && !isAuthRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const isAuthRequest = skipAuthUrls.some(path => err.config.url?.includes(path));
      
      if (!isAuthRequest && typeof window !== "undefined") {
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

console.log("BASE_URL=", BASE_URL);

export default API;
