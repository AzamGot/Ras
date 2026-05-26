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

function CreateSessionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    complaint_id: "",
    session_number: 1,
    scheduled_date: "",
    location: "",
    is_virtual: false,
    agenda: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.complaint_id || !form.scheduled_date) {
      setError("رقم القضية وتاريخ الجلسة مطلوبان");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/api/v1/disciplinary/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          scheduled_date: new Date(form.scheduled_date).toISOString(),
        }),
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
        <h2 className="text-lg font-bold text-gray-800 mb-4">جدولة جلسة تأديبية</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">رقم الجلسة</label>
              <input
                type="number"
                min={1}
                value={form.session_number}
                onChange={(e) => setForm({ ...form, session_number: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">تاريخ الجلسة *</label>
              <input
                type="datetime-local"
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_virtual"
              checked={form.is_virtual}
              onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_virtual" className="text-sm text-gray-700">
              جلسة عن بُعد
            </label>
          </div>
          {!form.is_virtual && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">مكان الجلسة</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                placeholder="قاعة الاجتماعات..."
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600 mb-1">جدول الأعمال</label>
            <textarea
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ الجدولة..." : "جدولة الجلسة"}
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

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  function load() {
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

  const canCreate =
    currentUser?.role === "admin" ||
    currentUser?.role === "committee_member" ||
    currentUser?.role === "committee_chair";

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
        <CreateSessionModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جلسات التأديب</h1>
          <p className="text-gray-500 text-sm mt-1">إجمالي: {total} جلسة</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + جدولة جلسة جديدة
          </button>
        )}
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
