import "./globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: { default: "MOSAIQ Admin", template: "%s | MOSAIQ Admin" },
  description: "MOSAIQ administration interface",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
