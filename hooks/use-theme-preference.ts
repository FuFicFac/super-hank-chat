"use client";

import { useTheme } from "next-themes";

export function useThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return { theme, setTheme, resolvedTheme };
}
