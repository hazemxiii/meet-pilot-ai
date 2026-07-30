"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";

export default function Header() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 flex items-center justify-between px-unit-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)] max-[800px]:left-0 max-[800px]:right-0 min-[800px]:left-64">
      <div className="flex items-center gap-unit-md">
        <button
          className="max-[800px]:flex min-[800px]:hidden p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
          onClick={() => setMobileOpen(true)}
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <button className="max-[800px]:hidden min-[800px]:flex items-center gap-2 px-unit-md py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors">
          <span className="material-symbols-outlined text-[20px]">
            grid_view
          </span>
          <span className="text-label-md font-label-md">
            Personal Workspace
          </span>
          <span className="material-symbols-outlined text-[20px]">
            unfold_more
          </span>
        </button>
      </div>

      <div className="flex items-center gap-unit-md">
        <button className="bg-primary text-on-primary px-unit-lg py-2 rounded-xl font-label-md text-label-md flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[20px]">
            auto_awesome
          </span>
          Analyze New Meeting
        </button>
        <div className="w-px h-8 bg-outline-variant"></div>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        {user && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-md border border-outline-variant">
            {user.email?.[0].toUpperCase() || "U"}
          </div>
        )}
      </div>
    </header>
  );
}
