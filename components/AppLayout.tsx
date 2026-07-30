"use client";

import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Don't show sidebar/header for login page or when loading
  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="w-full">
        <Header />
        <main className="pt-16 w-full max-w-[1280px] mx-auto px-[48px] bg-background min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
