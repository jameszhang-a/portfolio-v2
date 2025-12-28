import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { CSPostHogProvider } from "./providers";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/Toasts/ToastProvider";
import { ToastContainer } from "@/providers/Toasts/ToastContainer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "James Zhang",
  description: "Personal website of James Zhang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <CSPostHogProvider>
        <ToastProvider>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <ToastContainer />
            </ThemeProvider>
          </body>
        </ToastProvider>
      </CSPostHogProvider>
    </html>
  );
}
