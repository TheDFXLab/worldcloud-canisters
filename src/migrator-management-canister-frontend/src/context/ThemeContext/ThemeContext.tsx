import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import logoDark from "../../../assets/logo-dark.png";
import logoLight from "../../../assets/logo-dark.png";

interface ThemeContextType {
  isDarkMode: boolean;
  logo: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [logo, setLogo] = useState(logoLight);
  const getSavedTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setLogo(savedTheme === "dark" ? logoDark : logoLight);
      return savedTheme === "dark";
    }
    // If no saved preference, check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const setTheme = (isDarkMode: boolean) => {
    // Update the data-theme attribute on the document
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light"
    );
    // Save the preference
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      setTheme(newValue);
      setLogo(newValue ? logoDark : logoLight);
      return newValue;
    });
  };
  useEffect(() => {
    const savedTheme = getSavedTheme();
    setIsDarkMode(savedTheme);
    setTheme(savedTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        logo,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
