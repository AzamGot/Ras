"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    national_id: "",
    full_name_ar: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (!/^\d{10}$/.test(form.national_id)) {
      setError("رقم الهوية الوطنية يجب أن يتكون من 10 أرقام");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: form.national_id,
          full_name_ar: form.full_name_ar,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "خطأ في التسجيل");
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/dashboard/complaints/new");
    } catch {
      setError("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-green-700 py-12">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-gray-800">تسجيل حساب جديد</h1>
          <p className="text-gray-500 mt-1 text-sm">للمواطنين الراغبين في تقديم شكوى</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهوية الوطنية *
              </label>
              <input
                type="text"
                required
                value={form.national_id}
                onChange={update("national_id")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="1234567890"
                maxLength={10}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الجوال *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={update("phone")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الاسم الكامل بالعربية *
            </label>
            <input
              type="text"
              required
              value={form.full_name_ar}
              onChange={update("full_name_ar")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="محمد عبدالله الأحمدي"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البريد الإلكتروني *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="example@domain.com"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور *
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={update("password")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="8 أحرف على الأقل"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تأكيد كلمة المرور *
              </label>
              <input
                type="password"
                required
                value={form.confirm_password}
                onChange={update("confirm_password")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                dir="ltr"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            ⚠️ بتسجيلك، أقرّ بأن المعلومات المقدمة صحيحة، وأن تقديم معلومات كاذبة قد يعرضني للمسؤولية القانونية.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? "جارٍ التسجيل..." : "إنشاء الحساب"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          لديك حساب بالفعل؟{" "}
          <Link href="/auth/login" className="text-green-700 hover:text-green-900 font-medium">
            سجّل دخولك
          </Link>
        </div>
      </div>
    </div>
  );
}
