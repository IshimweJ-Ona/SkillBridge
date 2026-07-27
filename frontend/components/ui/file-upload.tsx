"use client";

import { Loader2, Paperclip, RefreshCw, UploadCloud, X } from "@/lib/icons";
import { useRef, useState } from "react";
import { useCloudinaryUpload } from "@/lib/use-cloudinary-upload";
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
// returned secure_url (max 2MB - enforced client-side by useCloudinaryUpload
// before the upload even starts). If not configured (the case in this
// environment, and in mock mode - neither has real Cloudinary credentials),
// falls back to a plain URL text input so the field still works end-to-end
// either way.
export function FileUpload({ label, value, onChange, folder, accept, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error, setError } = useCloudinaryUpload(folder);
  const [manualMode, setManualMode] = useState(false);

  const handleFileSelect = async (file: File) => {
    try {
      const url = await upload(file);
      onChange(url);
    } catch {
      setManualMode(true);
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
          // min-w-0 is required for `truncate` to actually clip inside a flex
          // item - without it, flex items refuse to shrink below their
          // content's intrinsic width and the URL overflows the box.
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[var(--sb-radius-sm)] border border-[var(--sb-border)] bg-[var(--sb-bg-inset)] px-3 text-xs text-[var(--sb-text)]">
            <Paperclip size={13} className="shrink-0 text-[var(--sb-text-faint)]" />
            <span className="min-w-0 flex-1 truncate">{value}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              title="Replace file"
              className="shrink-0 text-[var(--sb-text-faint)] hover:text-[var(--sb-primary)] disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              title="Remove file"
              className="shrink-0 text-[var(--sb-text-faint)] hover:text-[var(--sb-danger)]"
            >
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
      {(error || hint) && <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">{error ?? hint}</p>}
      <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">Max file size: 2MB.</p>
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
