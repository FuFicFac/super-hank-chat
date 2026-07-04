"use client";

import { useEffect, useState } from "react";

export type UiTheme = "classroom" | "dispatch";

const STORAGE_KEY = "shc-ui-theme";

function normalize(value: string | null): UiTheme {
  return value === "dispatch" ? "dispatch" : "classroom";
}

export function useUiTheme() {
  const [uiTheme, setUiThemeState] = useState<UiTheme>("classroom");

  useEffect(() => {
    const current = normalize(window.localStorage.getItem(STORAGE_KEY));
    setUiThemeState(current);
    document.documentElement.setAttribute("data-ui", current);
  }, []);

  const setUiTheme = (next: UiTheme) => {
    setUiThemeState(next);
    document.documentElement.setAttribute("data-ui", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleUiTheme = () => {
    setUiTheme(uiTheme === "classroom" ? "dispatch" : "classroom");
  };

  return { uiTheme, setUiTheme, toggleUiTheme };
}
