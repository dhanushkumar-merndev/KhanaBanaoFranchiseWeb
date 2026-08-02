import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins, Great_Vibes } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Khana Banao Franchise — Become a Franchise Partner",
    template: "%s | Khana Banao Franchise",
  },
  description:
    "Start your own premium event, wedding and corporate catering business with Khana Banao. Proven system, trusted brand, low investment and end-to-end support.",
  keywords: [
    "Khana Banao franchise",
    "catering franchise India",
    "food franchise",
    "wedding catering business",
    "low investment franchise",
  ],
  openGraph: {
    title: "Become a Khana Banao Franchise Partner",
    description:
      "Premium event, wedding and corporate catering — built on a proven, fully-supported system.",
    type: "website",
  },
  // App Router emits the <link> tags from here rather than from JSX in the
  // document head, so metadata stays in one place and Next can dedupe it.
  icons: {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#8e1218",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${poppins.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ className: "font-sans" }}
        />
      </body>
    </html>
  );
}
