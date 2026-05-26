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

function AppealModal({
  decisionId,
  appealDeadline,
  onClose,
  onSaved,
}: {
  decisionId: string;
  appealDeadline: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ appeal_date: "", grounds: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.appeal_date || !form.grounds) {
      setError("تاريخ الطعن وأسبابه مطلوبان");
      return;
    }
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API}/api/v1/disciplinary/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision_id: decisionId, ...form }),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">تقديم طعن</h2>
        {appealDeadline && (
          <p className="text-xs text-amber-600 mb-4">
            الموعد الأخير للطعن: {new Date(appealDeadline).toLocaleDateString("ar-SA")}
          </p>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">تاريخ الطعن *</label>
            <input
              type="date"
              value={form.appeal_date}
              onChange={(e) => setForm({ ...form, appeal_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">أسباب الطعن *</label>
            <textarea
              value={form.grounds}
              onChange={(e) => setForm({ ...form, grounds: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={4}
              placeholder="أدخل أسباب ومبررات الطعن..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ التقديم..." : "تقديم الطعن"}
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

function ExecutionModal({
  decisionId,
  onClose,
  onSaved,
}: {
  decisionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    execution_date: "",
    execution_method: "",
    execution_notes: "",
    fine_amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("access_token");
    try {
      const body: any = { decision_id: decisionId };
      if (form.execution_date) body.execution_date = form.execution_date;
      if (form.execution_method) body.execution_method = form.execution_method;
      if (form.execution_notes) body.execution_notes = form.execution_notes;
      if (form.fine_amount) body.fine_amount = parseFloat(form.fine_amount);
      const res = await fetch(`${API}/api/v1/disciplinary/executions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">تسجيل تنفيذ القرار</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">تاريخ التنفيذ</label>
            <input
              type="date"
              value={form.execution_date}
              onChange={(e) => setForm({ ...form, execution_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">طريقة التنفيذ</label>
            <input
              type="text"
              value={form.execution_method}
              onChange={(e) => setForm({ ...form, execution_method: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              placeholder="مثال: إشعار رسمي، إيقاف الترخيص..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">مبلغ الغرامة (إن وجد)</label>
            <input
              type="number"
              value={form.fine_amount}
              onChange={(e) => setForm({ ...form, fine_amount: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm"
              placeholder="بالريال السعودي"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">ملاحظات التنفيذ</label>
            <textarea
              value={form.execution_notes}
              onChange={(e) => setForm({ ...form, execution_notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ التسجيل..." : "تسجيل التنفيذ"}
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

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appealModal, setAppealModal] = useState<any | null>(null);
  const [executionModal, setExecutionModal] = useState<string | null>(null);
  const [ministerLoading, setMinisterLoading] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  function load() {
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

  async function approveMinister(id: string) {
    if (!confirm("هل تريد تسجيل موافقة الوزير على هذا القرار؟")) return;
    setMinisterLoading(id);
    const res = await fetch(`${API}/api/v1/disciplinary/decisions/${id}/minister-approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) load();
    else alert((await res.json()).detail || "حدث خطأ");
    setMinisterLoading(null);
  }

  const isAdmin = currentUser?.role === "admin";
  const isExecutor = currentUser?.role === "executor" || isAdmin;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div>
      {appealModal && (
        <AppealModal
          decisionId={appealModal.id}
          appealDeadline={appealModal.appeal_deadline}
          onClose={() => setAppealModal(null)}
          onSaved={load}
        />
      )}
      {executionModal && (
        <ExecutionModal
          decisionId={executionModal}
          onClose={() => setExecutionModal(null)}
          onSaved={load}
        />
      )}

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
                <th className="text-right p-4 text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">النتيجة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">العقوبة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">موافقة وزارية</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-right p-4 text-sm font-semibold text-gray-600">الإجراءات</th>
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
                        decision.is_guilty ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
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
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      {isAdmin &&
                        decision.requires_minister_approval &&
                        decision.minister_approval_status !== "approved" && (
                          <button
                            onClick={() => approveMinister(decision.id)}
                            disabled={ministerLoading === decision.id}
                            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg disabled:opacity-50 whitespace-nowrap"
                          >
                            موافقة الوزير
                          </button>
                        )}
                      {decision.status === "in_effect" && (
                        <button
                          onClick={() => setAppealModal(decision)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          تقديم طعن
                        </button>
                      )}
                      {isExecutor && decision.status === "in_effect" && (
                        <button
                          onClick={() => setExecutionModal(decision.id)}
                          className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          تسجيل تنفيذ
                        </button>
                      )}
                    </div>
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
