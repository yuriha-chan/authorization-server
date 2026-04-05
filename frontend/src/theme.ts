/** @format */

import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'JetBrains Mono', 'Fira Code', monospace" },
        body: { value: "'IBM Plex Sans', 'Inter', sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
      },
      colors: {
        brand: {
          50: { value: '#e0fff8' },
          100: { value: '#b3ffe9' },
          200: { value: '#80ffd6' },
          300: { value: '#4dffc4' },
          400: { value: '#1affa8' },
          500: { value: '#00e890' },
          600: { value: '#00b870' },
          700: { value: '#008850' },
          800: { value: '#005830' },
          900: { value: '#002810' },
        },
        accent: {
          50: { value: '#e6f0ff' },
          100: { value: '#b3d0ff' },
          200: { value: '#80afff' },
          300: { value: '#4d8fff' },
          400: { value: '#1a6fff' },
          500: { value: '#0055e8' },
          600: { value: '#0043b8' },
          700: { value: '#003188' },
          800: { value: '#001f58' },
          900: { value: '#000d28' },
        },
        danger: {
          400: { value: '#ff4d6d' },
          500: { value: '#e8003d' },
          600: { value: '#b80031' },
        },
        warn: {
          400: { value: '#ffce45' },
          500: { value: '#e8a800' },
          600: { value: '#b88300' },
        },
        surface: {
          900: { value: '#080c12' },
          800: { value: '#0d1320' },
          700: { value: '#121a2e' },
          600: { value: '#182238' },
          500: { value: '#1e2d4a' },
          400: { value: '#253757' },
          300: { value: '#2e4470' },
        },
      },
    },
    semanticTokens: {
      colors: {
        'chakra-body-bg': {
          value: { base: '#f7fafc', _dark: '#080c12' },
        },
        'chakra-body-text': {
          value: { base: '#1a202c', _dark: '#e2e8f0' },
        },
      },
    },
  },
});
