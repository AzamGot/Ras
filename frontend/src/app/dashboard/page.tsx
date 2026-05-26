"use client";
import { useEffect, useState } from "react";

interface Stats {
  total_complaints: number;
  pending_review: number;
  under_investigation: number;
  decisions_this_month: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدَّمة",
  registered: "مُقيَّدة",
  under_investigation: "قيد التحقيق",
  indictment_prep: "إعداد لائحة الادعاء",
  referred_to_committee: "محالة للتأديب",
  sessions_ongoing: "جلسات جارية",
  decision_issued: "صدر القرار",
  pending_minister: "بانتظار موافقة الوزير",
  in_effect: "نافذ",
  appealed: "مطعون فيه",
  executed: "منفَّذ",
  closed: "مغلق",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  registered: "bg-indigo-100 text-indigo-700",
  under_investigation: "bg-yellow-100 text-yellow-800",
  indictment_prep: "bg-orange-100 text-orange-700",
  referred_to_committee: "bg-purple-100 text-purple-700",
  sessions_ongoing: "bg-pink-100 text-pink-700",
  decision_issued: "bg-teal-100 text-teal-700",
  pending_minister: "bg-amber-100 text-amber-800",
  in_effect: "bg-green-100 text-green-700",
  appealed: "bg-red-100 text-red-700",
  executed: "bg-slate-100 text-slate-700",
  closed: "bg-gray-200 text-gray-600",
};

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: string; color: string }) {
  return (
    <div className={`rounded-2xl p-6 ${color} flex items-center justify-between`}>
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <span className="text-4xl opacity-70">{icon}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/complaints?size=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setComplaints(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    total: complaints.length,
    submitted: complaints.filter((c) => c.status === "submitted").length,
    under_investigation: complaints.filter((c) => c.status === "under_investigation").length,
    decisions: complaints.filter((c) => ["decision_issued", "in_effect", "executed"].includes(c.status)).length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
        <p className="text-gray-500 mt-1">نظرة عامة على الشكاوى والقضايا</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي الشكاوى" value={stats.total} icon="📋" color="bg-blue-50 text-blue-800" />
        <StatCard title="بانتظار المراجعة" value={stats.submitted} icon="⏳" color="bg-yellow-50 text-yellow-800" />
        <StatCard title="قيد التحقيق" value={stats.under_investigation} icon="🔍" color="bg-orange-50 text-orange-800" />
        <StatCard title="تم إصدار القرار" value={stats.decisions} icon="✅" color="bg-green-50 text-green-800" />
      </div>

      {/* Recent Complaints */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">أحدث الشكاوى</h2>
          <a href="/dashboard/complaints" className="text-green-700 text-sm hover:text-green-900">
            عرض الكل ←
          </a>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>لا توجد شكاوى حتى الآن</p>
            <a
              href="/dashboard/complaints/new"
              className="mt-3 inline-block bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800"
            >
              تقديم شكوى جديدة
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {complaint.reference_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[complaint.status] || "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[complaint.status] || complaint.status}
                    </span>
                    {complaint.severity && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        complaint.severity === "critical" ? "bg-red-100 text-red-700" :
                        complaint.severity === "high" ? "bg-orange-100 text-orange-700" :
                        complaint.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {complaint.severity === "critical" ? "حرجة" : complaint.severity === "high" ? "عالية" :
                         complaint.severity === "medium" ? "متوسطة" : "منخفضة"}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 font-medium mt-1 text-sm">{complaint.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {new Date(complaint.filing_date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <a
                  href={`/dashboard/complaints/${complaint.id}`}
                  className="text-green-700 hover:text-green-900 text-sm font-medium mr-4"
                >
                  عرض
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/dashboard/complaints/new", label: "شكوى جديدة", icon: "➕", desc: "تقديم شكوى ضد محامٍ" },
          { href: "/dashboard/ai-assistant", label: "المساعد الذكي", icon: "🤖", desc: "احصل على مساعدة قانونية" },
          { href: "/dashboard/lawyers", label: "سجل المحامين", icon: "👥", desc: "البحث في قاعدة البيانات" },
          { href: "/dashboard/monitoring", label: "لوحة الرصد", icon: "📡", desc: "مراقبة المخالفات" },
        ].map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="bg-white rounded-xl p-5 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-semibold text-gray-800 text-sm group-hover:text-green-700">{action.label}</div>
            <div className="text-gray-400 text-xs mt-1">{action.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
