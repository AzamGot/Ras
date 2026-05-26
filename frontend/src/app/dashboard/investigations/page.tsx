"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "جارٍ",
  completed: "مكتمل",
  suspended: "موقوف",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
};

function InterviewModal({
  investigationId,
  onClose,
  onSaved,
}: {
  investigationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    interviewee_name: "",
    interviewee_role: "",
    interview_date: "",
    notes: "",
    transcript: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.interviewee_name || !form.interview_date) {
      setError("اسم المستجوَب وتاريخ المقابلة مطلوبان");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/api/v1/investigations/${investigationId}/interviews`, {
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
        <h2 className="text-lg font-bold text-gray-800 mb-4">إضافة مقابلة تحقيق</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">اسم المستجوَب *</label>
              <input
                type="text"
                value={form.interviewee_name}
                onChange={(e) => setForm({ ...form, interviewee_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">صفة المستجوَب</label>
              <input
                type="text"
                value={form.interviewee_role}
                onChange={(e) => setForm({ ...form, interviewee_role: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                placeholder="مثال: محامي، شاهد..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">تاريخ المقابلة *</label>
            <input
              type="date"
              value={form.interview_date}
              onChange={(e) => setForm({ ...form, interview_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">نص المحضر</label>
            <textarea
              value={form.transcript}
              onChange={(e) => setForm({ ...form, transcript: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ الحفظ..." : "حفظ المقابلة"}
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

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [interviewModalFor, setInterviewModalFor] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  function loadInvestigations() {
    fetch(`${API}/api/v1/investigations?size=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setInvestigations(d.items || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذّر تحميل سجلات التحقيق");
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.json()
      ),
    ]).then(([userData]) => {
      setCurrentUser(userData);
      loadInvestigations();
    });
  }, []);

  async function closeInvestigation(id: string) {
    if (!confirm("هل تريد إغلاق هذا التحقيق وتحويله لمرحلة الادعاء؟")) return;
    setClosingId(id);
    try {
      const res = await fetch(`${API}/api/v1/investigations/${id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "حدث خطأ");
        return;
      }
      loadInvestigations();
    } catch {
      alert("تعذّر إغلاق التحقيق");
    } finally {
      setClosingId(null);
    }
  }

  const canAct = currentUser?.role === "admin" || currentUser?.role === "investigator";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div>
      {interviewModalFor && (
        <InterviewModal
          investigationId={interviewModalFor}
          onClose={() => setInterviewModalFor(null)}
          onSaved={loadInvestigations}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجلات التحقيق</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} سجل</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {investigations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد سجلات تحقيق</h3>
          <p className="text-gray-500">ستظهر سجلات التحقيق هنا بعد إسناد المحققين للشكاوى</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">رقم الشكوى</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">خطة التحقيق</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">تاريخ البدء</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الإجراء الموصى به</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
                {canAct && (
                  <th className="text-right p-4 text-sm font-semibold text-gray-600">الإجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {investigations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <a
                      href={`/dashboard/complaints/${inv.complaint_id}`}
                      className="font-mono text-blue-600 hover:underline text-sm"
                    >
                      {inv.complaint_id?.slice(0, 8)}...
                    </a>
                  </td>
                  <td className="p-4 text-sm text-gray-700 max-w-xs truncate">
                    {inv.investigation_plan || "—"}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {inv.start_date ? new Date(inv.start_date).toLocaleDateString("ar-SA") : "—"}
                  </td>
                  <td className="p-4 text-sm text-gray-700">{inv.recommended_action || "—"}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                  {canAct && (
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setInterviewModalFor(inv.id)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg"
                        >
                          إضافة مقابلة
                        </button>
                        {inv.status === "in_progress" && (
                          <button
                            onClick={() => closeInvestigation(inv.id)}
                            disabled={closingId === inv.id}
                            className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            {closingId === inv.id ? "جارٍ..." : "إغلاق التحقيق"}
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
