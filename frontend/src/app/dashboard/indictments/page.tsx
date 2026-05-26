"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  finalized: "معتمدة",
  referred: "محالة للجنة",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  finalized: "bg-blue-100 text-blue-800",
  referred: "bg-green-100 text-green-800",
};

function CreateIndictmentModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    complaint_id: "",
    full_text: "",
    title: "",
    prosecutor_sanction_rec: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.complaint_id || !form.full_text) {
      setError("رقم القضية ونص اللائحة مطلوبان");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/api/v1/indictments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, charges: [], aggravating_factors: [], mitigating_factors: [] }),
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
        <h2 className="text-lg font-bold text-gray-800 mb-4">إنشاء لائحة ادعاء جديدة</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">معرّف الشكوى (UUID) *</label>
            <input
              type="text"
              value={form.complaint_id}
              onChange={(e) => setForm({ ...form, complaint_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm font-mono"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">عنوان اللائحة</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">نص لائحة الادعاء *</label>
            <textarea
              value={form.full_text}
              onChange={(e) => setForm({ ...form, full_text: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={5}
              placeholder="أدخل نص لائحة الادعاء الكامل..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">توصية المدعي العام بالعقوبة</label>
            <input
              type="text"
              value={form.prosecutor_sanction_rec}
              onChange={(e) => setForm({ ...form, prosecutor_sanction_rec: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              placeholder="مثال: وقف مؤقت لمدة 6 أشهر"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ الإنشاء..." : "إنشاء اللائحة"}
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

export default function IndictmentsPage() {
  const [indictments, setIndictments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  function load() {
    fetch(`${API}/api/v1/indictments?size=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setIndictments(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل لوائح الادعاء");
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

  async function finalizeIndictment(id: string) {
    if (!confirm("هل تريد اعتماد هذه اللائحة؟")) return;
    setActionLoading(id + "_finalize");
    const res = await fetch(`${API}/api/v1/indictments/${id}/finalize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) load();
    else alert((await res.json()).detail || "حدث خطأ");
    setActionLoading(null);
  }

  async function referIndictment(id: string) {
    if (!confirm("هل تريد إحالة هذه اللائحة إلى لجنة التأديب؟")) return;
    setActionLoading(id + "_refer");
    const res = await fetch(`${API}/api/v1/indictments/${id}/refer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) load();
    else alert((await res.json()).detail || "حدث خطأ");
    setActionLoading(null);
  }

  const canCreate =
    currentUser?.role === "admin" || currentUser?.role === "prosecutor";

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
        <CreateIndictmentModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوائح الادعاء</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} لائحة</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + إنشاء لائحة ادعاء
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {indictments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد لوائح ادعاء</h3>
          <p className="text-gray-500">
            ستظهر لوائح الادعاء هنا بعد إغلاق التحقيقات وإعداد الوثائق
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم الوثيقة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">العنوان</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم القضية</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">توصية العقوبة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">تاريخ الإنشاء</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
                {canCreate && (
                  <th className="text-right p-4 text-sm font-semibold text-gray-600">الإجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {indictments.map((ind) => (
                <tr key={ind.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-sm text-gray-800">{ind.document_number}</td>
                  <td className="p-4 text-sm text-gray-700 max-w-xs truncate">
                    {ind.title || "—"}
                  </td>
                  <td className="p-4">
                    <a
                      href={`/dashboard/complaints/${ind.complaint_id}`}
                      className="font-mono text-blue-600 hover:underline text-sm"
                    >
                      {ind.complaint_id?.slice(0, 8)}...
                    </a>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {ind.prosecutor_sanction_rec || "—"}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(ind.created_at).toLocaleDateString("ar-SA")}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[ind.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[ind.status] || ind.status}
                    </span>
                  </td>
                  {canCreate && (
                    <td className="p-4">
                      <div className="flex gap-2">
                        {ind.status === "draft" && (
                          <button
                            onClick={() => finalizeIndictment(ind.id)}
                            disabled={actionLoading === ind.id + "_finalize"}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            اعتماد
                          </button>
                        )}
                        {ind.status === "finalized" && (
                          <button
                            onClick={() => referIndictment(ind.id)}
                            disabled={actionLoading === ind.id + "_refer"}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            إحالة للجنة
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
