import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacroBrief — US · UK · China",
  description: "Daily macro brief and decision-maker dashboard.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
