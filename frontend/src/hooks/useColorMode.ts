/** @format */

import { useTheme } from 'next-themes';
import type { ColorMode } from '../types';

export const useColorModeValue = <T,>(light: T, dark: T): T => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? dark : light;
};

export const useColorMode = (): {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: string) => void;
} => {
  const { setTheme, resolvedTheme } = useTheme();
  const toggleColorMode = () =>
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  return {
    colorMode: (resolvedTheme as ColorMode) || 'light',
    toggleColorMode,
    setColorMode: setTheme,
  };
};
