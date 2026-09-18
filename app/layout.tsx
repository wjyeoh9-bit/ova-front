import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OVA | Everyday Air Protection",
  description: "Meet OVA. Everyday Air Protection. Explore Black, Silver and Invisible and find your everyday.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
