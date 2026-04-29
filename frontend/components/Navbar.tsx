"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearAuth, getStoredUser } from "@/lib/auth";
import { LayoutDashboard, BookOpen, LogOut, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
  const router = useRouter();
  const path = usePathname();
  const user = getStoredUser();

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="bg-[#003087] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg tracking-wide flex items-center gap-2">
            <BookOpen size={20} className="text-[#C9A24A]" />
            OAB Simulado
          </Link>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 text-sm px-2 py-1 rounded transition-colors",
                path.startsWith(href) ? "bg-white/20 font-medium" : "hover:bg-white/10"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/80 hidden sm:block">{user?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm hover:text-red-300 transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
