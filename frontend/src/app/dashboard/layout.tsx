"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: "🏠", roles: ["all"] },
  { href: "/dashboard/complaints", label: "الشكاوى", icon: "📋", roles: ["all"] },
  { href: "/dashboard/complaints/new", label: "شكوى جديدة", icon: "➕", roles: ["complainant"] },
  { href: "/dashboard/investigations", label: "سجلات التحقيق", icon: "🔍", roles: ["admin", "investigator", "prosecutor"] },
  { href: "/dashboard/indictments", label: "لوائح الادعاء", icon: "📄", roles: ["admin", "prosecutor", "committee_member", "committee_chair"] },
  { href: "/dashboard/lawyers", label: "سجل المحامين", icon: "👥", roles: ["admin", "investigator", "prosecutor", "committee_member", "committee_chair"] },
  { href: "/dashboard/sessions", label: "جلسات التأديب", icon: "⚖️", roles: ["admin", "committee_member", "committee_chair"] },
  { href: "/dashboard/decisions", label: "القرارات", icon: "📜", roles: ["admin", "committee_member", "committee_chair", "executor"] },
  { href: "/dashboard/monitoring", label: "لوحة الرصد", icon: "📡", roles: ["admin"] },
];

function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => item.roles.includes("all") || item.roles.includes(role)
  );

  return (
    <aside className="w-72 bg-green-900 text-white flex flex-col min-h-screen fixed right-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-green-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <h1 className="font-bold text-sm leading-tight">منصة نظر الشكاوى</h1>
            <p className="text-green-400 text-xs">ضد المحامين</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-green-700 text-white"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant */}
      <div className="p-4 border-t border-green-800">
        <Link
          href="/dashboard/ai-assistant"
          className="flex items-center gap-3 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          <span>🤖</span>
          <span>المساعد القانوني الذكي</span>
        </Link>
      </div>
    </aside>
  );
}

function Topbar({ user }: { user: { full_name_ar: string; role: string } | null }) {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/auth/login");
  }

  const roleLabels: Record<string, string> = {
    complainant: "مشتكي",
    lawyer: "محامي",
    investigator: "محقق",
    prosecutor: "مدعٍ عام",
    committee_member: "عضو لجنة التأديب",
    committee_chair: "رئيس لجنة التأديب",
    executor: "منفذ قرارات",
    admin: "مشرف",
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 mr-72 fixed top-0 left-0 right-72 z-30">
      <div className="text-gray-800 font-medium">
        مرحباً، {user?.full_name_ar || "المستخدم"}
      </div>
      <div className="flex items-center gap-4">
        <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
          {roleLabels[user?.role || ""] || user?.role}
        </span>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-600 text-sm transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ full_name_ar: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={user?.role || "complainant"} />
      <Topbar user={user} />
      <main className="mr-72 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
