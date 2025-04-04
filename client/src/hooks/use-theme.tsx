import { useState, useEffect, createContext, useContext, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: ReactNode;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from localStorage, defaults to "light"
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    return savedTheme || "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove any existing theme class
    root.classList.remove("light", "dark");

    // Apply the selected theme
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen for changes in system color scheme
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    // Initial check
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };
    
    // Set initial value
    handleChange();
    
    // Add listener for changes
    mediaQuery.addEventListener("change", handleChange);
    
    // Cleanup
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};