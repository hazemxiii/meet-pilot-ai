"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function ProfileHeader({
  title,
  button,
}: {
  title: string;
  button?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  return (
    <section className="grid grid-cols-12 gap-[24px] items-end mt-[48px] transition-all duration-700 opacity-100 translate-y-0">
      <div className="col-span-12 lg:col-span-8 flex flex-col md:flex-row items-center md:items-end gap-[24px]">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/10 rounded-full scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative w-48 h-48 rounded-full bg-primary flex items-center justify-center text-on-primary text-[64px] font-bold shadow-xl border-4 border-surface">
            {/* {user.email?.[0].toUpperCase() || "U"} */}
            <img
              src={user.user_metadata?.avatar_url || ""}
              width="100%"
              height="100%"
              alt={user.email?.[0].toUpperCase() || "U"}
              className="rounded-full object-cover"
            />
          </div>
        </div>
        <div className="flex flex-col text-center md:text-left pb-2">
          <span className="font-label-md text-label-md text-secondary tracking-widest uppercase mb-1">
            {title}
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            {user.user_metadata?.full_name || user.email}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {user.email}
          </p>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4 flex justify-center lg:justify-end gap-[24px] pb-2">
        {/* <button
          onClick={() => router.push("/")}
          className="px-[24px] py-3 bg-surface-container-high text-on-surface-variant font-label-md text-label-md rounded-xl hover:bg-surface-container-highest transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
          Back to Home
        </button> */}
        {button}
      </div>
    </section>
  );
}
