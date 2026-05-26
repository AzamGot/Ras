"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدولة",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API}/api/v1/disciplinary/sessions?size=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل الجلسات");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جلسات التأديب</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} جلسة</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🏛️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد جلسات</h3>
          <p className="text-gray-500">ستظهر جلسات لجنة التأديب هنا بعد إحالة القضايا</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم الجلسة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم القضية</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">تاريخ الجلسة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">المكان</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">النتيجة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-gray-800">#{session.session_number}</td>
                  <td className="p-4">
                    <a
                      href={`/dashboard/complaints/${session.complaint_id}`}
                      className="font-mono text-blue-600 hover:underline text-sm"
                    >
                      {session.complaint_id?.slice(0, 8)}...
                    </a>
                  </td>
                  <td className="p-4 text-sm text-gray-700">
                    {session.scheduled_date
                      ? new Date(session.scheduled_date).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {session.is_virtual ? "عن بُعد" : session.location || "—"}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {session.session_outcome || "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[session.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[session.status] || session.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
