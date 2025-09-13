"use client";

import React, { useState } from "react";
import { safeGet, safePost } from "@/lib/fetcher";


type Resource = "containers" | "clients" | "movements";

export default function SearchBar() {
  const [resource, setResource] = useState<Resource>("containers");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("authToken") ?? "" : ""
  );

  async function doSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) {
      setError("Please enter an ID or query.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const path = `/${resource}/${encodeURIComponent(query.trim())}`;

    try {
      const json = await safeGet<any>(path);
      if (!json) {
        setError("Unauthorized");
        setResult(null);
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError(err?.response?.data?.meta?.message ?? err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin() {
    const username = prompt("username", "superadmin") ?? "";
    const password = prompt("password", "admin123") ?? "";
    if (!username || !password) return;

    try {
      setLoading(true);
      const json = await safePost<any>("/login", { username, password });

      if (!json) {
        alert("Unauthorized");
        return;
      }

      const tokenFromResp =
        json?.data?.[0]?.token ?? json?.data?.token ?? json?.data?.token;
      if (tokenFromResp) {
        localStorage.setItem("authToken", tokenFromResp);
        localStorage.setItem("token", tokenFromResp);
        setToken(tokenFromResp);
        alert("Token saved.");
      } else {
        alert("Login success but no token found in response.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.meta?.message ?? err?.message ?? "Login error");
    } finally {
      setLoading(false);
    }
  }

  function prettyJSON(obj: any) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
  function renderResult(json: any) {
    const data = json?.data ?? json;

    if (Array.isArray(data)) {
      if (resource === "movements") {
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left bg-gray-100">
                  <th className="p-2">ID</th>
                  <th className="p-2">Container</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Time</th>
                  <th className="p-2 hidden md:table-cell">Notes</th>
                  <th className="p-2 hidden sm:table-cell">User</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d: any) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{d.id}</td>
                    <td className="p-2">{d.container_id}</td>
                    <td className="p-2">{d.movement_type}</td>
                    <td className="p-2">{d.timestamp}</td>
                    <td className="p-2 hidden md:table-cell">{d.notes}</td>
                    <td className="p-2 hidden sm:table-cell">{d.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (resource === "containers") {
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left bg-gray-100">
                  <th className="p-2">ID</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 hidden sm:table-cell">Client</th>
                  <th className="p-2 hidden md:table-cell">QR</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d: any) => (
                  <tr key={d.id ?? d.container_id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{d.id ?? d.container_id}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2 hidden sm:table-cell">{d.current_client ?? d.client_id}</td>
                    <td className="p-2 hidden md:table-cell">{d.qr_code ?? d.qr_code_image}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (resource === "clients") {
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left bg-gray-100">
                  <th className="p-2">ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2 hidden sm:table-cell">Phone</th>
                  <th className="p-2 hidden md:table-cell">Address</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d: any, i: number) => (
                  <tr key={d.id ?? i} className="border-t hover:bg-gray-50">
                    <td className="p-2">{d.id}</td>
                    <td className="p-2">{d.name ?? d.full_name}</td>
                    <td className="p-2 hidden sm:table-cell">{d.phone}</td>
                    <td className="p-2 hidden md:table-cell">{d.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // fallback
      return <pre className="whitespace-pre-wrap overflow-x-auto p-2 bg-gray-100 rounded">{prettyJSON(data)}</pre>;
    }

    // if data is object -> show details
    if (data && typeof data === "object") {
      // known object shapes
      if (resource === "clients") {
        return (
          <div className="space-y-2 p-3 bg-gray-50 rounded">
            <div><strong>ID:</strong> {data.id}</div>
            <div><strong>Name:</strong> {data.name ?? data.full_name}</div>
            <div><strong>Phone:</strong> {data.phone}</div>
            <div><strong>Address:</strong> {data.address}</div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Raw JSON</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-x-auto p-2 bg-gray-100 rounded text-xs">{prettyJSON(data)}</pre>
            </details>
          </div>
        );
      }

      if (resource === "containers") {
        return (
          <div className="space-y-2 p-3 bg-gray-50 rounded">
            <div><strong>ID:</strong> {data.id ?? data.container_id}</div>
            <div><strong>Status:</strong> {data.status}</div>
            <div><strong>QR:</strong> {data.qr_code ?? data.qr_code_image}</div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Raw JSON</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-x-auto p-2 bg-gray-100 rounded text-xs">{prettyJSON(data)}</pre>
            </details>
          </div>
        );
      }

      return (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-blue-600">View Raw JSON</summary>
          <pre className="mt-2 whitespace-pre-wrap overflow-x-auto p-2 bg-gray-100 rounded text-xs">{prettyJSON(data)}</pre>
        </details>
      );
    }

    return <pre className="overflow-x-auto p-2 bg-gray-100 rounded">{String(data)}</pre>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 align-left">
      <form onSubmit={doSearch} className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value as Resource)}
            className="px-3 py-2 rounded border flex-shrink-0 sm:w-auto w-full"
          >
            <option value="containers">Container</option>
            <option value="movements">Movements (by container id)</option>
            <option value="clients">Client</option>
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CONT002 or 1"
            className="flex-1 px-3 py-2 rounded border w-full"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60 flex-1"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("token");
                setToken("");
                alert("Saved token cleared.");
              }}
              className="px-3 py-2 rounded border text-sm hidden sm:block"
            >
              Clear token
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mb-6 p-4 bg-white border rounded shadow-sm">
          <h4 className="font-semibold mb-3">Result</h4>
          {renderResult(result)}
        </div>
      )}
      
      <style jsx>{`
        @media (max-width: 640px) {
          table {
            font-size: 0.75rem;
          }
          th, td {
            padding: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}