import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whale Alert",
  description: "Realtime crypto whale alert dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
