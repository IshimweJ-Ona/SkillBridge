"use client";

import { Camera, Loader2 } from "@/lib/icons";
import { useRef } from "react";
import { useCloudinaryUpload } from "@/lib/use-cloudinary-upload";
import { Avatar } from "./avatar";

export function AvatarUpload({
  firstName,
  lastName,
  imageUrl,
  onChange,
  size = 96,
}: {
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  onChange: (url: string) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useCloudinaryUpload("skillbridge/avatars");

  const handleFileSelect = async (file: File) => {
    try {
      const url = await upload(file);
      onChange(url);
    } catch {
      // error state is already surfaced below via the hook
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar firstName={firstName} lastName={lastName} imageUrl={imageUrl} size={size} clickable />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Change photo"
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--sb-bg-panel)] bg-[var(--sb-primary)] text-white shadow-[var(--sb-shadow-sm)] hover:bg-[var(--sb-primary-hover)] disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelect(file);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1.5 max-w-[180px] text-center text-[10px] text-[var(--sb-danger)]">{error}</p>}
      <p className="mt-1 text-[10px] text-[var(--sb-text-faint)]">Max file size: 2MB.</p>
    </div>
  );
}
