import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Sound Room",
  description:
    "Find, evaluate, repair, and track vintage speakers and receivers near Udall, Kansas.",
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
      <body>{children}</body>
    </html>
  );
}
