import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL ?? "https://homi.app"),
  title: {
    default: "HOMI — Message any driver. Anywhere. Instantly.",
    template: "%s · HOMI",
  },
  description:
    "Send a message to any driver using only their license plate. Anonymous, instant, free. Waze × Nextdoor for driver-to-driver communication.",
  openGraph: {
    siteName: "HOMI",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070810",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
