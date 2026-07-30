import { cn } from "@/lib/utils";
import { BASE_PATH } from "@/lib/base-path";

// Plain <img>, not next/image: this app is self-hosted without `sharp`
// installed, so next/image's optimizer isn't available (see page-loader.tsx
// for the same convention). BASE_PATH is applied manually since raw path
// strings don't get Next's automatic basePath prefixing.
export const LOGO_SRC = `${BASE_PATH}/SkillBridge_logo.png`;

export function Logo({
  className,
  mark = false,
  size = 30,
}: {
  className?: string;
  mark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <span
        className="relative shrink-0 overflow-hidden rounded-[0.6rem] shadow-[0_2px_10px_rgba(0,0,0,0.5)] ring-1 ring-[var(--sb-border-strong)]"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="SkillBridge" className="h-full w-full object-cover" />
      </span>
      {!mark && (
        <span className="text-[var(--sb-text)]" style={{ fontSize: size * 0.62 }}>
          SkillBridge<span className="text-[var(--sb-primary)]">.</span>
        </span>
      )}
    </span>
  );
}
