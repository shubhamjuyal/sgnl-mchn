import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Signal Machine",
  description: "Internal radar — Oriental Gem Co",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
