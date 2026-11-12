"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition-all duration-200 group
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-800 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-700"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 rotate-0 scale-100
            text-amber-500
            dark:rotate-90 dark:scale-0 dark:opacity-0`}
        />
        <Moon 
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 -rotate-90 scale-0 opacity-0
            text-blue-400
            dark:rotate-0 dark:scale-100 dark:opacity-100`}
        />
      </div>
    </button>
  );
}
