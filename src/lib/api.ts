import axios from "axios";
import { API_BASE } from "./config";
import { currentIdToken } from "./firebase";

export const api = axios.create({ baseURL: API_BASE });

/**
 * Firebase sessions send a fresh ID token on every request (they expire hourly);
 * development panel logins send the stored API token.
 */
export async function authToken(): Promise<string | null> {
  if (localStorage.getItem("sg_auth") === "firebase") {
    const token = await currentIdToken();
    if (token) {
      localStorage.setItem("sg_token", token);
      return token;
    }
  }
  return localStorage.getItem("sg_token");
}

api.interceptors.request.use(async (config) => {
  const token = await authToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || (error.response ? "Request failed." : "Can't reach SureGad. Check your connection.");
    const code = error.response?.data?.error?.code || "REQUEST_FAILED";
    return Promise.reject(Object.assign(new Error(message), { code, details: error.response?.data?.error?.details, status: error.response?.status }));
  },
);

export type ApiError = Error & { code?: string; details?: unknown; status?: number };

/** Download a CSV (or any file) from an authenticated endpoint. */
export async function downloadFile(path: string, fallbackName: string) {
  const response = await api.get(path, { responseType: "blob" });
  const disposition = String(response.headers["content-disposition"] || "");
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Open a private file (documents) the API serves either as a signed URL or as bytes. */
export async function openPrivateFile(path: string) {
  const response = await api.get(path, { responseType: "blob" });
  const blob = response.data as Blob;
  if (blob.type.includes("json")) {
    const body = JSON.parse(await blob.text()) as { data?: { url?: string } };
    if (body.data?.url) window.open(body.data.url, "_blank", "noopener");
    return;
  }
  window.open(URL.createObjectURL(blob), "_blank", "noopener");
}
