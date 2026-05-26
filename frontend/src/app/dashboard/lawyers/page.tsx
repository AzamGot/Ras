"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-yellow-100 text-yellow-800",
  disbarred: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  disbarred: "مشطوب",
};

function RiskBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <span className="text-gray-400 text-sm">غير محدد</span>;
  const level =
    score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "moderate" : "low";
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    moderate: "bg-yellow-100 text-yellow-800",
    low: "bg-green-100 text-green-800",
  };
  const labels: Record<string, string> = {
    critical: "خطر بالغ",
    high: "خطر مرتفع",
    moderate: "خطر متوسط",
    low: "خطر منخفض",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            level === "critical"
              ? "bg-red-500"
              : level === "high"
              ? "bg-orange-500"
              : level === "moderate"
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[level]}`}>
        {score} — {labels[level]}
      </span>
    </div>
  );
}

export default function LawyersPage() {
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [riskResults, setRiskResults] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API}/api/v1/lawyers?size=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setLawyers(d.items || d || []);
        setTotal(d.total || (d.items || d || []).length);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل سجل المحامين");
        setLoading(false);
      });
  }, []);

  const analyzeRisk = async (lawyerId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAnalyzing(lawyerId);
    try {
      const r = await fetch(`${API}/api/v1/ai/lawyers/${lawyerId}/risk-score`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      setRiskResults((prev) => ({ ...prev, [lawyerId]: d }));
    } catch {
      // ignore
    } finally {
      setAnalyzing(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">سجل المحامين</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} محامٍ</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {lawyers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">⚖️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد بيانات محامين</h3>
          <p className="text-gray-500">سيتم إضافة المحامين عند تقديم شكاوى ضدهم أو تسجيلهم في النظام</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم الترخيص</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">التخصص</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">درجة المخاطر</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">تحليل المخاطر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lawyers.map((lawyer) => {
                const riskData = riskResults[lawyer.id];
                return (
                  <tr key={lawyer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-sm text-gray-800">{lawyer.license_number}</td>
                    <td className="p-4 text-sm text-gray-700">{lawyer.specialization || "—"}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[lawyer.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[lawyer.status] || lawyer.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <RiskBadge score={riskData?.risk_score ?? lawyer.risk_score} />
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => analyzeRisk(lawyer.id)}
                        disabled={analyzing === lawyer.id}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {analyzing === lawyer.id ? "جاري التحليل..." : "تحليل بالذكاء الاصطناعي"}
                      </button>
                      {riskData && (
                        <div className="mt-2 text-xs text-gray-600 max-w-xs">
                          {riskData.summary?.slice(0, 100)}...
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
