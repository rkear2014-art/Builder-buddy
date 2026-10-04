import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-family",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-family",
});

export const metadata: Metadata = {
  title: {
    default: "Builder Buddy",
    template: "%s · Builder Buddy",
  },
  description: "Job diary, materials lists, and customer sign-off for UK tradespeople.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f0b429",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
