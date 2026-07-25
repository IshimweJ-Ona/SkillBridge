"use client";

import { Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { media } from "@/lib/api";
import { Input } from "./input";

interface FileUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  hint?: string;
}

// Requests a Cloudinary signature from the backend; if credentials are
// configured there, uploads the file directly to Cloudinary and stores the
// returned secure_url. If not configured (the case in this environment, and
// in mock mode - neither has real Cloudinary credentials), falls back to a
// plain URL text input so the field still works end-to-end either way.
export function FileUpload({ label, value, onChange, folder, accept, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const signature = await media.getUploadSignature(folder);
      if (!signature.configured) {
        setManualMode(true);
        setError("File uploads aren't configured in this environment - paste a URL instead.");
        return;
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
      onChange(result.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try pasting a URL instead.");
      setManualMode(true);
    } finally {
      setUploading(false);
    }
  };

  if (manualMode) {
    return (
      <div>
        <Input
          label={label}
          placeholder="https://..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          hint={error ?? hint}
        />
        <button
          type="button"
          onClick={() => {
            setManualMode(false);
            setError(null);
          }}
          className="mt-1 text-[10px] text-[var(--sb-primary)] hover:underline"
        >
          Try uploading a file instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-[var(--sb-text-muted)]">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        {value ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-xs text-[var(--sb-text)]">
            <Paperclip size={13} className="shrink-0 text-[var(--sb-text-faint)]" />
            <span className="truncate">{value}</span>
            <button type="button" onClick={() => onChange("")} className="ml-auto shrink-0 text-[var(--sb-text-faint)] hover:text-[var(--sb-danger)]">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--sb-radius-sm)] border border-dashed border-[var(--sb-border-strong)] text-xs text-[var(--sb-text-muted)] hover:bg-[var(--sb-bg-panel-hover)] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {uploading ? "Uploading..." : "Click to upload a file"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelect(file);
            event.target.value = "";
          }}
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">{hint}</p>}
      <button
        type="button"
        onClick={() => setManualMode(true)}
        className="mt-1 text-[10px] text-[var(--sb-primary)] hover:underline"
      >
        Or paste a URL instead
      </button>
    </div>
  );
}
