"use client";

import { Paintbrush } from "lucide-react";
import { useUiTheme } from "@/hooks/use-ui-theme";

export function UiThemeToggle() {
  const { uiTheme, toggleUiTheme } = useUiTheme();

  return (
    <button
      type="button"
      className="ui-theme-toggle classroom-button inline-flex items-center justify-center"
      title="Switch look"
      aria-label="Switch look"
      aria-pressed={uiTheme === "dispatch"}
      onClick={toggleUiTheme}
    >
      <Paintbrush className="h-4 w-4" aria-hidden />
    </button>
  );
}
