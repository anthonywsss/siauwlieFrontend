import axios from "axios";

const API = axios.create({
  baseURL: "http://103.197.190.167:8080",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default API;