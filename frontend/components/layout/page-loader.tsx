"use client";

import { useEffect, useState } from "react";

const LOADING_PHRASES = [
  "Bridging skills...",
  "Loading opportunities...",
  "Connecting employers...",
  "Building futures...",
];

const STEP_MS = 900;

export function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(8);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((current) => Math.min(current + 23, 100));
      setPhraseIndex((current) => (current + 1) % LOADING_PHRASES.length);
    }, STEP_MS);

    const fadeTimer = window.setTimeout(() => {
      setProgress(100);
      setFading(true);
    }, STEP_MS * LOADING_PHRASES.length);

    const removeTimer = window.setTimeout(
      () => setVisible(false),
      STEP_MS * LOADING_PHRASES.length + 450,
    );

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--sb-bg)] transition-opacity duration-[450ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="sb-loader-logo h-24 w-24 sm:h-28 sm:w-28 md:h-36 md:w-36 lg:h-44 lg:w-44 xl:h-52 xl:w-52 2xl:h-64 2xl:w-64">
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image's
            optimizer needs `sharp`, which isn't a dependency here; plain img
            matches how every other image in this app is rendered. */}
        <img
          src="/SkillBridge_logo.png"
          alt="SkillBridge"
          className="h-full w-full object-contain drop-shadow-[0_0_28px_rgba(228,41,63,0.45)]"
        />
      </div>

      <div className="mt-8 h-[3px] w-40 overflow-hidden rounded-full bg-[var(--sb-border)] sm:w-48 md:w-56 lg:w-64 xl:w-72 2xl:w-80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--sb-primary)] to-[var(--sb-primary-hover)] transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--sb-text-faint)] sm:text-[11px] lg:text-xs 2xl:text-sm">
        {LOADING_PHRASES[phraseIndex]}
      </p>
    </div>
  );
}
