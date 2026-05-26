"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function AIAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا مساعدك القانوني. يمكنني مساعدتك في:\n• صياغة شكواك بشكل واضح ومكتمل\n• شرح الإجراءات والمتطلبات النظامية\n• توجيهك لتقديم الأدلة اللازمة\n\nكيف يمكنني مساعدتك اليوم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("فشل الاتصال");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                aiText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: aiText };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مجدداً." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-96">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <div>
          <h3 className="font-bold text-gray-800 text-sm">المساعد القانوني الذكي</h3>
          <p className="text-gray-400 text-xs">يعمل بالذكاء الاصطناعي</p>
        </div>
        <span className="mr-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">متصل</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-gray-100 text-gray-800 rounded-tr-sm"
                  : "bg-green-700 text-white rounded-tl-sm"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.content}
              {msg.role === "assistant" && loading && i === messages.length - 1 && !msg.content && (
                <span className="inline-block animate-pulse">●</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="اكتب سؤالك أو وصف مشكلتك..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}

export default function NewComplaintPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    incident_date: "",
    is_confidential: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<any>(null);

  const update = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (form.description.trim().length < 50) {
      setError("يرجى وصف الشكوى بتفصيل أكثر (50 حرفاً على الأقل)");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/api/v1/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          incident_date: form.incident_date || null,
          is_confidential: form.is_confidential,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "حدث خطأ في تقديم الشكوى");
        return;
      }

      const complaint = await res.json();
      router.push(`/dashboard/complaints/${complaint.id}`);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  const severityLabels: Record<string, string> = {
    low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة"
  };
  const severityColors: Record<string, string> = {
    low: "text-green-700 bg-green-50",
    medium: "text-yellow-700 bg-yellow-50",
    high: "text-orange-700 bg-orange-50",
    critical: "text-red-700 bg-red-50",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">تقديم شكوى جديدة</h1>
        <p className="text-gray-500 mt-1 text-sm">
          وفق نظام المحاماة م/38 واللائحة التنفيذية 1446هـ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                موضوع الشكوى *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={update("title")}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="مثال: إخلال المحامي بالتزاماته تجاه موكله"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تفاصيل الشكوى * <span className="text-gray-400 font-normal">(على الأقل 50 حرفاً)</span>
              </label>
              <textarea
                required
                value={form.description}
                onChange={update("description")}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="اشرح تفاصيل المخالفة بدقة: ما الذي حدث؟ متى حدث؟ ما الأدلة التي لديك؟ ما الضرر الذي لحق بك؟"
              />
              <div className="text-xs text-gray-400 text-left mt-1">
                {form.description.length} حرف
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الحادثة (تقريبي)
                </label>
                <input
                  type="date"
                  value={form.incident_date}
                  onChange={update("incident_date")}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  dir="ltr"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_confidential}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_confidential: e.target.checked }))}
                    className="w-4 h-4 text-green-700 rounded"
                  />
                  <span className="text-sm text-gray-700">طلب السرية التامة</span>
                </label>
              </div>
            </div>

            {/* AI Classification Result */}
            {classification && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span>🤖</span>
                  <span className="text-sm font-bold text-blue-800">التصنيف الأولي بالذكاء الاصطناعي</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">نوع المخالفة:</span>
                    <p className="font-medium text-gray-800 mt-0.5">{classification.violation_subtype || classification.violation_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">درجة الخطورة:</span>
                    <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[classification.severity]}`}>
                      {severityLabels[classification.severity] || classification.severity}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">التحليل:</span>
                    <p className="text-gray-700 mt-0.5 text-xs leading-relaxed">{classification.reasoning_ar}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? "جارٍ تقديم الشكوى..." : "تقديم الشكوى"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>

          {/* Guidelines */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <h4 className="font-bold text-amber-800 mb-2">📌 إرشادات تقديم الشكوى</h4>
            <ul className="space-y-1.5 text-amber-700">
              <li>• أرفق جميع المستندات والأدلة الداعمة لشكواك</li>
              <li>• حدّد اسم المحامي ورقم ترخيصه إن أمكن</li>
              <li>• اذكر التاريخ التقريبي للمخالفة</li>
              <li>• تقديم معلومات كاذبة قد يعرضك للمسؤولية</li>
            </ul>
          </div>
        </div>

        {/* AI Chat Assistant */}
        <div>
          <AIAssistantPanel />

          <div className="mt-4 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <h4 className="font-bold mb-2 text-gray-700">مراحل نظر الشكوى</h4>
            <div className="space-y-2">
              {[
                { step: "1", label: "تقديم الشكوى", desc: "يتم إرسالها للإدارة فور التقديم" },
                { step: "2", label: "القيد والفرز", desc: "مراجعة المتطلبات الشكلية" },
                { step: "3", label: "التحقيق", desc: "يُعيَّن محقق لجمع الأدلة" },
                { step: "4", label: "إعداد لائحة الادعاء", desc: "يعدّها المدعي العام" },
                { step: "5", label: "جلسات التأديب", desc: "الاستماع للطرفين وإصدار القرار" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-700 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-medium text-gray-700">{item.label}</p>
                    <p className="text-gray-400 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
