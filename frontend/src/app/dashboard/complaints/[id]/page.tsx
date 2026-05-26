"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_STEPS = [
  { key: "submitted", label: "مُقدَّمة" },
  { key: "registered", label: "مُقيَّدة" },
  { key: "under_investigation", label: "التحقيق" },
  { key: "indictment_prep", label: "لائحة الادعاء" },
  { key: "referred_to_committee", label: "الإحالة للتأديب" },
  { key: "sessions_ongoing", label: "الجلسات" },
  { key: "decision_issued", label: "القرار" },
  { key: "in_effect", label: "نافذ" },
];

function StatusTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                i < currentIndex
                  ? "bg-green-700 text-white"
                  : i === currentIndex
                  ? "bg-green-500 text-white ring-4 ring-green-100"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {i < currentIndex ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs mt-1 text-center ${
                i <= currentIndex ? "text-green-700 font-medium" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`absolute h-0.5 top-4 ${
                  i < currentIndex ? "bg-green-500" : "bg-gray-200"
                }`}
                style={{
                  right: `${(STATUS_STEPS.length - 1 - i) * (100 / (STATUS_STEPS.length - 1))}%`,
                  width: `${100 / (STATUS_STEPS.length - 1)}%`,
                  transform: "translateX(50%)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (passed: boolean, notes: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"pass" | "reject">("pass");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">قيد وفرز الشكوى</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setDecision("pass")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                decision === "pass"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              قبول الشكوى
            </button>
            <button
              onClick={() => setDecision("reject")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                decision === "reject"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              رفض الشكوى
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">ملاحظات الفرز</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none"
              rows={3}
              placeholder="أدخل ملاحظات الفرز الشكلي..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onConfirm(decision === "pass", notes)}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ التنفيذ..." : "تأكيد"}
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

function AssignInvestigatorModal({
  investigators,
  onConfirm,
  onClose,
  loading,
}: {
  investigators: { id: string; full_name_ar: string }[];
  onConfirm: (investigatorId: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">إسناد محقق</h2>
        {investigators.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            لا يوجد محققون مسجلون في النظام
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {investigators.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelected(inv.id)}
                className={`w-full text-right px-4 py-3 rounded-lg text-sm transition-colors ${
                  selected === inv.id
                    ? "bg-green-50 border-2 border-green-500 text-green-800 font-medium"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent"
                }`}
              >
                {inv.full_name_ar}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={loading || !selected}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "جارٍ الإسناد..." : "إسناد"}
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

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [investigators, setInvestigators] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    if (!token) return;

    Promise.all([
      fetch(`${API}/api/v1/complaints/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
      fetch(`${API}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([complaintData, userData]) => {
        setComplaint(complaintData);
        setCurrentUser(userData);
        setLoading(false);
      })
      .catch(() => {
        setError("تعذر تحميل بيانات الشكوى");
        setLoading(false);
      });
  }, [params.id]);

  async function triggerClassification() {
    setClassifying(true);
    try {
      await fetch(`${API}/api/v1/ai/classify-complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ complaint_id: params.id }),
      });
      const res = await fetch(`${API}/api/v1/complaints/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaint(await res.json());
    } finally {
      setClassifying(false);
    }
  }

  async function handleRegister(passed: boolean, notes: string) {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/api/v1/complaints/${params.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passed, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "حدث خطأ");
      }
      setComplaint(await res.json());
      setShowRegisterModal(false);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function openAssignModal() {
    setShowAssignModal(true);
    if (investigators.length === 0) {
      try {
        const res = await fetch(`${API}/api/v1/auth/users?role=investigator`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvestigators(await res.json());
      } catch {
        setInvestigators([]);
      }
    }
  }

  async function handleAssignInvestigator(investigatorId: string) {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`${API}/api/v1/complaints/${params.id}/assign-investigator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ investigator_id: investigatorId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "حدث خطأ");
      }
      setComplaint(await res.json());
      setShowAssignModal(false);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>;
  if (error || !complaint) return <div className="p-8 text-center text-red-500">{error || "الشكوى غير موجودة"}</div>;

  const isAdmin = currentUser?.role === "admin";

  const severityColors: Record<string, string> = {
    low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
  };
  const severityLabels: Record<string, string> = {
    low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة"
  };

  const statusLabels: Record<string, string> = {
    submitted: "مُقدَّمة",
    registered: "مُقيَّدة",
    under_investigation: "قيد التحقيق",
    indictment_prep: "إعداد لائحة الادعاء",
    referred_to_committee: "محالة للجنة",
    sessions_ongoing: "جلسات جارية",
    decision_issued: "صدر قرار",
    in_effect: "نافذ",
    rejected: "مرفوضة",
    appealed: "مطعون فيه",
    executed: "منفّذ",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showRegisterModal && (
        <RegisterModal
          onConfirm={handleRegister}
          onClose={() => setShowRegisterModal(false)}
          loading={actionLoading}
        />
      )}
      {showAssignModal && (
        <AssignInvestigatorModal
          investigators={investigators}
          onConfirm={handleAssignInvestigator}
          onClose={() => setShowAssignModal(false)}
          loading={actionLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
              → العودة
            </button>
            <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded text-gray-600">
              {complaint.reference_number}
            </span>
            {complaint.is_confidential && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">سري</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{complaint.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            تاريخ التقديم: {new Date(complaint.filing_date).toLocaleDateString("ar-SA")}
          </p>
        </div>
        {complaint.severity && (
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${severityColors[complaint.severity]}`}>
            خطورة {severityLabels[complaint.severity]}
          </span>
        )}
      </div>

      {/* Progress Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-bold text-gray-700 mb-6 text-sm">مراحل الشكوى</h2>
        <div className="relative overflow-x-auto pb-2">
          <StatusTimeline status={complaint.status} />
        </div>
      </div>

      {/* Admin Actions Banner */}
      {isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-700 text-xs font-semibold mb-3">إجراءات المشرف</p>
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-3">
              {actionError}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {complaint.status === "submitted" && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                قيد الشكوى
              </button>
            )}
            {complaint.status === "registered" && (
              <button
                onClick={openAssignModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                إسناد محقق
              </button>
            )}
            {complaint.status === "under_investigation" && (
              <a
                href={`/dashboard/investigations`}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                عرض سجلات التحقيق
              </a>
            )}
            {complaint.status === "indictment_prep" && (
              <a
                href={`/dashboard/indictments`}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                إعداد لائحة الادعاء
              </a>
            )}
            {complaint.status === "referred_to_committee" && (
              <a
                href={`/dashboard/sessions`}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-lg font-medium"
              >
                جدولة جلسة تأديبية
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 mb-4">تفاصيل الشكوى</h2>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* AI Classification */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <span>🤖</span> تصنيف الذكاء الاصطناعي
              </h2>
              {!complaint.ai_classification && (
                <button
                  onClick={triggerClassification}
                  disabled={classifying}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {classifying ? "جارٍ التصنيف..." : "تصنيف الشكوى"}
                </button>
              )}
            </div>

            {complaint.ai_classification ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-xs mb-1">نوع المخالفة</p>
                    <p className="font-bold text-gray-800">{complaint.ai_classification.violation_subtype || complaint.violation_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-xs mb-1">درجة الخطورة</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityColors[complaint.severity]}`}>
                      {severityLabels[complaint.severity]}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-xs mb-1">مستوى الثقة</p>
                    <p className="font-bold text-gray-800">
                      {Math.round((complaint.ai_classification.confidence || 0) * 100)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-xs mb-1">تستوجب عناية عاجلة</p>
                    <p className={`font-bold ${complaint.ai_classification.requires_urgent_attention ? "text-red-600" : "text-green-600"}`}>
                      {complaint.ai_classification.requires_urgent_attention ? "نعم" : "لا"}
                    </p>
                  </div>
                </div>
                {complaint.ai_classification.reasoning_ar && (
                  <div className="bg-blue-50 rounded-xl p-4 text-sm">
                    <p className="text-blue-800 text-xs font-medium mb-1">التحليل والتبرير:</p>
                    <p className="text-blue-700 leading-relaxed">{complaint.ai_classification.reasoning_ar}</p>
                  </div>
                )}
                {complaint.applicable_articles?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs mb-2">المواد النظامية المنتهكة:</p>
                    <div className="flex flex-wrap gap-2">
                      {complaint.applicable_articles.map((art: string) => (
                        <span key={art} className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                          المادة {art}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-6">
                لم يتم تصنيف الشكوى بعد
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-700 text-sm mb-4">معلومات الشكوى</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">الحالة الحالية</span>
                <span className="font-medium text-gray-800">
                  {statusLabels[complaint.status] || complaint.status}
                </span>
              </div>
              {complaint.assigned_investigator_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">المحقق المُسند</span>
                  <span className="font-medium text-green-700">مُسند</span>
                </div>
              )}
              {complaint.incident_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">تاريخ الحادثة</span>
                  <span className="font-medium text-gray-800">
                    {new Date(complaint.incident_date).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">السرية</span>
                <span className={`font-medium ${complaint.is_confidential ? "text-red-600" : "text-gray-600"}`}>
                  {complaint.is_confidential ? "سري" : "عادي"}
                </span>
              </div>
              {complaint.minister_approval_required && (
                <div className="flex justify-between">
                  <span className="text-gray-500">موافقة الوزير</span>
                  <span className="text-amber-600 font-medium">مطلوبة</span>
                </div>
              )}
              {complaint.formal_check_notes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-gray-500 text-xs mb-1">ملاحظات الفرز</p>
                  <p className="text-gray-700 text-xs">{complaint.formal_check_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
