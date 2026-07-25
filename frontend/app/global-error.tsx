"use client";

import { useEffect } from "react";

// Catches errors that escape even the root layout (e.g. a crash inside
// AuthProvider/ToastProvider itself). Must render its own <html>/<body> per
// Next.js convention since it replaces the root layout when triggered.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#09090b",
          color: "#f5f5f6",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>SkillBridge hit an unexpected error</h1>
        <p style={{ maxWidth: 380, fontSize: "0.875rem", color: "#a1a1aa" }}>
          This only affects your current browser tab - please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: "2.5rem",
            padding: "0 1.25rem",
            borderRadius: "0.5rem",
            background: "#e4293f",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
