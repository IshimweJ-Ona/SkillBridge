import { useState } from "react";
import { media } from "./api";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB - applies to every upload (avatar, portfolio, CV)

export function useCloudinaryUpload(folder?: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<string> => {
    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const message = `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB) - the maximum is 2MB.`;
      setError(message);
      throw new Error(message);
    }

    setUploading(true);
    try {
      const signature = await media.getUploadSignature(folder);
      if (!signature.configured) {
        throw new Error("File uploads aren't configured in this environment - paste a URL instead.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signature.apiKey);
      formData.append("timestamp", String(signature.timestamp));
      formData.append("signature", signature.signature);
      formData.append("folder", signature.folder);
      if (signature.publicId) formData.append("public_id", signature.publicId);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}.`);
      }

      const result = (await response.json()) as { secure_url: string };
      return result.secure_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Try pasting a URL instead.";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, setError };
}
