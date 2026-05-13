"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import React from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      enableColorScheme
      storageKey="theme-preference"
    >
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
