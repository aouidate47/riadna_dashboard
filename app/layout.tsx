import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://riadna.ma"), 
  title: {
    default: "Riadna | Riad management made simple",
    template: "%s | Riadna", 
  },
  description:
    "Riadna is the all-in-one dashboard for riad owners in Morocco: manage rooms, arrivals, departures and bookings in one calm place.",
  applicationName: "Riadna",
  keywords: ["riad", "riad management", "Marrakech", "bookings", "hospitality", "Morocco", "riadna", "riad system", "riad management system"],
  authors: [{ name: "Yaran", url: "https://yaranagency.netlify.app" }],
  creator: "Yaran",
  icons: {
    icon: "/riadna-logo.png",
    apple: "/riadna-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Riadna",
    title: "Riadna | Riad management made simple",
    description: "Your riad, running beautifully. Rooms, arrivals and bookings in one place.",
    images: [{ url: "/riadna-logo.png", width: 500, height: 500, alt: "Riadna" }],
  },
  twitter: {
    card: "summary",
    title: "Riadna | Riad management made simple",
    description: "Your riad, running beautifully.",
    images: ["/riadna-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}