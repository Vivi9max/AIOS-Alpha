import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AIOS",
  description: "Let's build something meaningful.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
