import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@/app/globals.css";
import Footer from "../components/layout/footer";
import Nav from "../components/layout/navbar";
import { cn } from "@/lib/utils";
import { AuthProvider } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <AuthProvider>
          <Nav />
          <main className="flex min-h-screen flex-col items-center justify-start gap-12 relative">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
