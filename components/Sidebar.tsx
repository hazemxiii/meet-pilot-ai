"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobileOpen, setMobileOpen } = useSidebar();

  const navItems = [
    { path: "/tasks", label: "Tasks", icon: "check_circle" },
    { path: "/memory", label: "Memory", icon: "description" },
    { path: "/profile", label: "Profile", icon: "person" },
  ];

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
  }, [pathname]);

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
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col z-50 
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
          min-[800px]:translate-x-0
        `}
      >
        <div className="p-unit-lg flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]">
              auto_awesome
            </span>
          </div>
          <span className="font-headline-md text-headline-md text-primary tracking-tight">
            Meet Pilot
          </span>
        </div>

        <nav className="flex-1 px-unit-md mt-unit-sm space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-unit-md py-3 rounded-xl transition-all font-label-md text-label-md ${
                  isActive
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined mr-3">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-unit-lg mt-auto border-t border-outline-variant/30">
          {user && (
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-md">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-label-md font-label-md text-on-surface truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-label-sm font-label-sm text-on-surface-variant truncate">
                  Pro Plan
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
