import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Signal Machine",
  description: "Internal radar — Oriental Gem Co",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
