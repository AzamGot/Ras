"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API}/api/v1/ai/monitoring/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { alerts: [] })
      .then((data) => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">لوحة رصد المخالفات</h1>
        <p className="text-gray-500 text-sm mt-1">مراقبة ذكية للمحامين ذوي المخاطر العالية</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "محامون عاليو الخطورة", value: "—", icon: "⚠️", color: "bg-red-50 text-red-800" },
          { label: "تنبيهات نشطة", value: "—", icon: "🔔", color: "bg-amber-50 text-amber-800" },
          { label: "مراجعات مجدولة", value: "—", icon: "📅", color: "bg-blue-50 text-blue-800" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-5 ${stat.color} flex items-center gap-4`}>
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-sm font-medium opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">📡</div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">نظام رصد المخالفات بالذكاء الاصطناعي</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
          يعمل النظام على تحليل أنماط الشكاوى واكتشاف المحامين ذوي المخاطر العالية،
          مع إرسال تنبيهات فورية للمشرفين عند تجاوز الحدود المقررة.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-right">
          {[
            "تحليل أنماط الشكاوى بالذكاء الاصطناعي",
            "احتساب درجة المخاطر لكل محامٍ",
            "رصد التكرار في نفس نوع المخالفة",
            "تقارير دورية للمشرفين",
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
