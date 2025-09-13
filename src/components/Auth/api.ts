import axios from "axios";

const API = axios.create({
  baseURL: "http://103.197.190.167:8080",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/sign-in?expired=1";
      return Promise.reject(null);
    }
    return Promise.reject(err);
  }
);


export default API;
