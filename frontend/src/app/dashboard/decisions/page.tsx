"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  signed: "موقّع",
  pending_minister: "بانتظار الوزير",
  approved: "معتمد",
  in_effect: "نافذ",
  appealed: "مطعون فيه",
  stayed: "موقوف التنفيذ",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  signed: "bg-blue-100 text-blue-800",
  pending_minister: "bg-amber-100 text-amber-800",
  approved: "bg-teal-100 text-teal-800",
  in_effect: "bg-green-100 text-green-800",
  appealed: "bg-red-100 text-red-800",
  stayed: "bg-orange-100 text-orange-800",
};

const SANCTION_LABELS: Record<string, string> = {
  warning: "تنبيه",
  censure: "لوم",
  fine: "غرامة مالية",
  temp_suspension: "وقف مؤقت",
  extended_suspension: "وقف ممتد",
  disbarment: "شطب نهائي",
};

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API}/api/v1/disciplinary/decisions?size=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setDecisions(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل القرارات");
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
          <h1 className="text-2xl font-bold text-gray-900">القرارات التأديبية</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} قرار</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد قرارات</h3>
          <p className="text-gray-500">ستظهر القرارات التأديبية هنا بعد اكتمال جلسات اللجنة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم القرار</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم القضية</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">تاريخ القرار</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">النتيجة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">العقوبة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">موافقة وزارية</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {decisions.map((decision) => (
                <tr key={decision.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-gray-800">{decision.decision_number}</td>
                  <td className="p-4">
                    <a
                      href={`/dashboard/complaints/${decision.complaint_id}`}
                      className="font-mono text-blue-600 hover:underline text-sm"
                    >
                      {decision.complaint_id?.slice(0, 8)}...
                    </a>
                  </td>
                  <td className="p-4 text-sm text-gray-700">
                    {decision.decision_date
                      ? new Date(decision.decision_date).toLocaleDateString("ar-SA")
                      : "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        decision.is_guilty
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {decision.is_guilty ? "مذنب" : "بريء"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-700">
                    {SANCTION_LABELS[decision.sanction_type] || decision.sanction_type || "—"}
                  </td>
                  <td className="p-4 text-sm">
                    {decision.requires_minister_approval ? (
                      <span className="text-amber-700 font-medium">
                        {decision.minister_approval_status === "approved"
                          ? "تمت الموافقة"
                          : "مطلوبة"}
                      </span>
                    ) : (
                      <span className="text-gray-400">لا تلزم</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[decision.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[decision.status] || decision.status}
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
