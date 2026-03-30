import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  ring: string;
}

const lightColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#020617',
  card: '#ffffff',
  cardForeground: '#020617',
  border: '#e2e8f0',
  input: '#e2e8f0',
  primary: '#10b981',
  primaryForeground: '#ffffff',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#f1f5f9',
  accentForeground: '#020617',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  ring: '#10b981',
};

const darkColors: ThemeColors = {
  background: '#090b11',
  foreground: '#f8fafc',
  card: '#0e1117',
  cardForeground: '#f8fafc',
  border: '#1e293b',
  input: '#1e293b',
  primary: '#10b981',
  primaryForeground: '#ffffff',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  accent: '#1e293b',
  accentForeground: '#f8fafc',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  ring: '#10b981',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(
    (systemColorScheme === 'dark' ? 'dark' : 'light') as ThemeMode
  );

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await SecureStore.getItemAsync('appTheme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    await SecureStore.setItemAsync('appTheme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
