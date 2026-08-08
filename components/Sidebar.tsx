"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useEffect } from "react";
import { CheckCircle2, FileText, BrainCircuit, Video, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { isMobileOpen, setMobileOpen } = useSidebar();

  const navItems = [
    { path: "/meetings", label: "Meetings", icon: Video },
    { path: "/tasks", label: "Tasks", icon: CheckCircle2 },
    { path: "/notes", label: "Notes", icon: FileText },
    { path: "/memory", label: "Memory", icon: BrainCircuit },
  ];

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
  }, [pathname, isMobileOpen, setMobileOpen]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-background border-r flex flex-col z-50 transform transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "min-[800px]:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            Meet Pilot
          </span>
        </div>

        <nav className="flex-1 px-4 mt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center px-4 py-3 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
