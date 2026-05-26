"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", submitted: "مُقدَّمة", registered: "مُقيَّدة",
  under_investigation: "قيد التحقيق", indictment_prep: "إعداد لائحة الادعاء",
  referred_to_committee: "محالة للتأديب", sessions_ongoing: "جلسات جارية",
  decision_issued: "صدر القرار", pending_minister: "بانتظار موافقة الوزير",
  in_effect: "نافذ", appealed: "مطعون فيه", executed: "منفَّذ", closed: "مغلق",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700",
  registered: "bg-indigo-100 text-indigo-700", under_investigation: "bg-yellow-100 text-yellow-800",
  indictment_prep: "bg-orange-100 text-orange-700", referred_to_committee: "bg-purple-100 text-purple-700",
  sessions_ongoing: "bg-pink-100 text-pink-700", decision_issued: "bg-teal-100 text-teal-700",
  pending_minister: "bg-amber-100 text-amber-800", in_effect: "bg-green-100 text-green-700",
  appealed: "bg-red-100 text-red-700", executed: "bg-slate-100 text-slate-600", closed: "bg-gray-200 text-gray-500",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة"
};
const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams({ page: String(page), size: "20" });
    if (statusFilter) params.append("status", statusFilter);

    fetch(`${API}/api/v1/complaints?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setComplaints(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الشكاوى</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي {total} شكوى</p>
        </div>
        <Link
          href="/dashboard/complaints/new"
          className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          + شكوى جديدة
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "الكل" },
          { value: "submitted", label: "مُقدَّمة" },
          { value: "under_investigation", label: "قيد التحقيق" },
          { value: "referred_to_committee", label: "محالة للتأديب" },
          { value: "decision_issued", label: "صدر القرار" },
          { value: "in_effect", label: "نافذ" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-green-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">جارٍ التحميل...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500">لا توجد شكاوى</p>
            <Link
              href="/dashboard/complaints/new"
              className="mt-4 inline-block bg-green-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-800"
            >
              تقديم شكوى جديدة
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">رقم الشكوى</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الموضوع</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">الخطورة</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">تاريخ التقديم</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {c.reference_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 truncate max-w-xs">{c.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.severity ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[c.severity]}`}>
                        {SEVERITY_LABELS[c.severity]}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.filing_date).toLocaleDateString("ar-SA")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/complaints/${c.id}`}
                      className="text-green-700 hover:text-green-900 font-medium"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
