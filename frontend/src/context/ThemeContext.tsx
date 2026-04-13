import * as React from 'react';

/**
 * Represents the available theme options.
 * - 'dark' for dark mode
 * - 'light' for light mode
 */
type Theme = 'dark' | 'light';

/**
 * Context type for managing theme state.
 */
interface ThemeContextType {
  /** The current active theme. */
  theme: Theme;

  /** Function to explicitly set the theme to a specific value. */
  setTheme(theme: Theme): void;

  /** Function to toggle the theme between 'dark' and 'light'. */
  toggleTheme(): void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

/**
 * Custom hook to access the theme context.
 * Must be used within a ThemeProvider.
 * @returns {ThemeContextType} The current theme context value.
 * @throws {Error} If used outside of a ThemeProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextType {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Props for the ThemeProvider component.
 * @property children - The child components that will have access to the theme context.
 */
interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Provides theme context to its children.
 * Initializes theme based on localStorage, falling back to system preference.
 * Applies the 'dark' class to the document root when in dark mode.
 * Persists theme changes to localStorage.
 */
export function ThemeProvider({children}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // Check localStorage first
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Sets the theme to a specific value.
   * @param {Theme} newTheme - The theme to set ('dark' or 'light').
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  /**
   * Toggles the theme between 'dark' and 'light'.
   */
  const toggleTheme = () => {
    setThemeState(theme === 'dark' ? 'light' : 'dark');
  };

  return <ThemeContext.Provider value={{theme, setTheme, toggleTheme}}>{children}</ThemeContext.Provider>;
}
