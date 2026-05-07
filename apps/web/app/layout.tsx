import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-noto-serif-kr",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const isLocal = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: isLocal ? "[로컬] Photocafe" : "Photocafe",
  description: "포토북/앨범 인쇄업체를 위한 통합 ERP 시스템",
  icons: {
    icon: isLocal
      ? "/images/favicon-512x512_Brown.png"
      : "/images/favicon-512x512_red.png",
    apple: isLocal
      ? "/images/apple-touch-icon_Brown.png"
      : "/images/apple-touch-icon_red.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Photocafe",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body
        className={`${inter.variable} ${notoSansKR.variable} ${notoSerifKR.variable} font-sans`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
