import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vorabpauschale Tax App",
  description: "B2B Steueranwendung fuer deutsche Steuerberatungskanzleien",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
