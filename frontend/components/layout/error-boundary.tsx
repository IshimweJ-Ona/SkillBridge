"use client";

import { AlertTriangle } from "@/lib/icons";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

// React error boundaries must be class components (no hook equivalent yet).
// Scoped around the dashboard's main content area only, so a crash in one
// page's widgets doesn't take the persistent sidebar/top nav/logout with it.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sb-danger-soft)] text-[var(--sb-danger)]">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--sb-text)]">This page ran into a problem</p>
            <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
              The rest of SkillBridge is unaffected - use the sidebar to keep going, or retry this page.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => this.setState({ error: null })}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
