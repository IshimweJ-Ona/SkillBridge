import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { CloudinarySignature } from "../types";

const base = API_BASES.learning;

export const mediaApi = {
  getUploadSignature: (folder?: string) =>
    apiFetch<CloudinarySignature>(base, "/media/cloudinary/signature", { method: "POST", body: { folder } }),
};
