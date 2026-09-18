import type { Metadata } from "next";
import { ThemeProvider } from "./_components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Agent Builder",
  description: "Build an AI sales agent that understands your company, qualifies leads, and books meetings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
