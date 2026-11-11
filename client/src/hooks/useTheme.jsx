import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "query-master-theme";
const ThemeContext = createContext(null);

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// A real context, not a bare hook with its own useState — theme needs to be shared
// (Settings toggles it, the Sidebar/Topbar/Dashboard all need to reactively re-render
// off the same value, e.g. to pick the right chart colors) rather than each caller
// holding its own independent, out-of-sync copy.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || "dark");

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
