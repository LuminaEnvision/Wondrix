import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

// Self-hosted so CI does not fetch Google Fonts. next/font/google builds fail
// when Google returns extensionless kit URLs (vercel/next.js#99114).
const display = localFont({
  src: "./fonts/fraunces.woff2",
  variable: "--font-display",
  weight: "500 700",
  display: "swap",
});

const body = localFont({
  src: "./fonts/nunito.woff2",
  variable: "--font-body",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wondrix",
  description:
    "Wondrix: your friend on the learning path. Support with school, or follow your interests.",
  appleWebApp: { capable: true, title: "Wondrix", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1f6f68",
  width: "device-width",
  initialScale: 1,
  // Kids tap fast: no accidental zoom on double tap, but pinch-zoom stays allowed (accessibility).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
