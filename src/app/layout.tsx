import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EasyTransfer - Temporary File Sharing",
  description:
    "Share files instantly without creating an account. Files are automatically deleted when you close your browser tab.",
  keywords: ["file sharing", "temporary", "no account", "instant", "secure"],
  authors: [{ name: "EasyTransfer" }],
  openGraph: {
    title: "EasyTransfer - Temporary File Sharing",
    description: "Share files instantly without creating an account",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
