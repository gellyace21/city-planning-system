import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Josefin_Sans,
  Montserrat,
  Open_Sans,
  Rubik,
} from "next/font/google";
import "@/app/globals.css";
import Footer from "../components/layout/footer";
import Nav from "../components/layout/navbar";
import { cn } from "@/lib/utils";
import { AuthProvider } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat-next",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-josefin",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-open-sans",
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rubik",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Planning Developmet Office",
  description: "Created by OJT Students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans",
        inter.variable,
        montserrat.variable,
        josefin.variable,
        openSans.variable,
        rubik.variable,
      )}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-open-sans antialiased bg-background`}
      >
        <AuthProvider>
          <Nav />
          <main className="flex min-h-screen flex-col items-center justify-start gap-12 relative mt-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
