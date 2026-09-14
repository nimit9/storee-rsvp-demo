import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme) {
  return theme === "dark" || (theme === "system" && systemDark());
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolve(theme));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "system",
  );
  // Derived here rather than read off the DOM at mount, so the icon can't drift
  // out of sync when the OS flips while the preference is "system".
  const [dark, setDark] = useState(() => resolve(theme));

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
    apply(t);
    setDark(resolve(t));
  }, []);

  // Re-apply when the OS theme changes while on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      apply("system");
      setDark(systemDark());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return { theme, dark, setTheme };
}
