import type { CloudinarySignature } from "../types";
import { mockLatency } from "./store";

export const mediaApiMock = {
  async getUploadSignature(): Promise<CloudinarySignature> {
    await mockLatency(80, 200);
    // Mirrors the real backend's unconfigured-credentials response - mock
    // mode has no real Cloudinary account either, so FileUpload's manual-URL
    // fallback path is exercised the same way here as it would be against a
    // real but unconfigured backend.
    return { configured: false, message: "Cloudinary credentials are not configured. Use stored URLs in local demo mode." };
  },
};
