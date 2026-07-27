"use client";

import { X } from "@/lib/icons";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({
  firstName,
  lastName,
  imageUrl,
  size = 36,
  className,
  clickable = false,
}: {
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  /** Opens a full-screen lightbox on click - only meaningful when imageUrl is set. */
  clickable?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const canEnlarge = clickable && Boolean(imageUrl);

  return (
    <>
      <div
        role={canEnlarge ? "button" : undefined}
        tabIndex={canEnlarge ? 0 : undefined}
        onClick={canEnlarge ? () => setLightboxOpen(true) : undefined}
        onKeyDown={
          canEnlarge
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") setLightboxOpen(true);
              }
            : undefined
        }
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--sb-primary-hover)] to-[var(--sb-primary-active)] font-semibold text-white shadow-[0_2px_8px_-1px_var(--sb-primary-glow)] ring-2 ring-[var(--sb-bg-panel)]",
          canEnlarge && "cursor-pointer",
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/image's
          // optimizer needs `sharp`, which isn't a dependency here; plain img
          // matches how every other image in this app is rendered.
          <img src={imageUrl} alt={`${firstName} ${lastName}`} className="h-full w-full object-cover" />
        ) : (
          initials(firstName, lastName)
        )}
      </div>

      {lightboxOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${firstName} ${lastName}`}
            className="max-h-full max-w-full rounded-[var(--sb-radius-lg)] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
