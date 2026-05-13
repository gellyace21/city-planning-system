"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { IconX, IconSun, IconMoon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
}: SettingsModalProps): React.JSX.Element | null {
  const { theme, setTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-screen bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Theme Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-card-foreground mb-3">
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Light Mode */}
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  theme === "light"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <IconSun
                  size={24}
                  className={
                    theme === "light" ? "text-primary" : "text-muted-foreground"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    theme === "light" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Light
                </span>
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  theme === "dark"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <IconMoon
                  size={24}
                  className={
                    theme === "dark" ? "text-primary" : "text-muted-foreground"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    theme === "dark" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Dark
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
