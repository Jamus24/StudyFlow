import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/app-providers";
import { Analytics } from "@vercel/analytics/next";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://studyflow.app";
const description =
  "Study Flow turns your syllabus into a focused, weekly study plan. AI-built schedules, spaced-repetition flashcards, and a tutor that actually knows what you’re working on.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Study Flow – AI Study Planner for Students",
    template: "%s · Study Flow",
  },
  description,
  applicationName: "Study Flow",
  keywords: [
    "AI study planner",
    "student productivity",
    "study schedule",
    "spaced repetition",
    "AI tutor",
    "exam prep",
    "flashcards",
  ],
  authors: [{ name: "Study Flow Labs" }],
  creator: "Study Flow Labs",
  publisher: "Study Flow Labs",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Study Flow",
    title: "Study Flow – AI Study Planner for Students",
    description,
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "Study Flow AI study planner dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Flow – AI Study Planner",
    description,
    images: ["/og.svg"],
    creator: "@studyflow_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "education",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1222" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Study Flow",
  applicationCategory: "EducationApplication",
  operatingSystem: "Web",
  description,
  offers: {
    "@type": "Offer",
    price: "9.00",
    priceCurrency: "USD",
  },
  creator: { "@type": "Organization", name: "Study Flow Labs" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <AppProviders>{children}</AppProviders>
          <Toaster />
          <Sonner position="bottom-right" richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
