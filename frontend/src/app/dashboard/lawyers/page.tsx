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

function CreateLawyerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    license_number: "",
    bar_registration_date: "",
    license_type: "مزاول",
    specialization: "",
    office_name: "",
    office_city: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.license_number || !form.bar_registration_date) {
      setError("رقم الترخيص وتاريخ التسجيل مطلوبان");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/api/v1/lawyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "حدث خطأ");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">تسجيل محامٍ جديد</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">رقم الترخيص *</label>
              <input
                type="text"
                value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">تاريخ التسجيل *</label>
              <input
                type="date"
                value={form.bar_registration_date}
                onChange={(e) => setForm({ ...form, bar_registration_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">نوع الترخيص</label>
            <select
              value={form.license_type}
              onChange={(e) => setForm({ ...form, license_type: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            >
              <option value="مزاول">مزاول</option>
              <option value="متدرب">متدرب</option>
              <option value="موقوف">موقوف</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">التخصص</label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              placeholder="مثال: قانون تجاري، قانون جنائي..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">اسم المكتب</label>
              <input
                type="text"
                value={form.office_name}
                onChange={(e) => setForm({ ...form, office_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">المدينة</label>
              <input
                type="text"
                value={form.office_city}
                onChange={(e) => setForm({ ...form, office_city: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ التسجيل..." : "تسجيل المحامي"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium"
          >
            إلغاء
          </button>
        </div>
      </div>
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  function load() {
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
  }

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((u) => {
        setCurrentUser(u);
        load();
      });
  }, []);

  const analyzeRisk = async (lawyerId: string) => {
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

  const isAdmin = currentUser?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div>
      {showCreate && (
        <CreateLawyerModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل المحامين</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} محامٍ</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + تسجيل محامٍ جديد
          </button>
        )}
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
          <p className="text-gray-500">
            سيتم إضافة المحامين عند تقديم شكاوى ضدهم أو تسجيلهم في النظام
          </p>
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
                {isAdmin && (
                  <th className="text-right p-4 text-sm font-semibold text-gray-600">الشكاوى</th>
                )}
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
                    {isAdmin && (
                      <td className="p-4">
                        <span className="text-xs text-gray-600">
                          {lawyer.complaint_count ?? 0} شكوى
                        </span>
                      </td>
                    )}
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
