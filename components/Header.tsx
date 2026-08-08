"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { Menu, Sparkles, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function Header() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur z-40 flex items-center justify-between px-6 border-b max-[800px]:left-0 max-[800px]:right-0 min-[800px]:left-64">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="max-[800px]:flex min-[800px]:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Analyze New Meeting
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-5 w-5" />
        </Button>
        {user && (
          <Link href="/profile" className="rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-8 w-8 border hover:opacity-80 transition-opacity cursor-pointer">
              <AvatarImage src={user.user_metadata?.avatar_url || ""} />
              <AvatarFallback>{user.email?.[0].toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  );
}
