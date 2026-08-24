import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meet Pilot AI - AI-Powered Meeting Analysis",
  description:
    "Transform your meetings into actionable insights with AI-powered analysis, task extraction, and intelligent note-taking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AuthProvider>
            <SidebarProvider>
              <Sidebar />
              <div className="w-full">
                <Header />
                <main className="w-full max-w-[1280px] mx-auto pl-0 min-[800px]:pl-64 pt-16 bg-background min-h-screen">
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
