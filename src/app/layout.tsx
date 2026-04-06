import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SecurityWrapper from "../components/SecurityWrapper";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "EasyTransfer - Temporary File Sharing",
  description:
    "Share files instantly without creating an account. Files are automatically deleted when you close your browser tab.",
  keywords: ["file sharing", "temporary", "no account", "instant", "secure"],
  authors: [{ name: "EasyTransfer" }],
  manifest: "/manifest.json",
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
      <body className={`${inter.className} antialiased`}>
        <SecurityWrapper>{children}</SecurityWrapper>
      </body>
    </html>
  );
}
