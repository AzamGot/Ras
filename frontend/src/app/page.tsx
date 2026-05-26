import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      {/* Header */}
      <div className="text-center mb-12 px-4">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl">⚖️</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          منصة نظر الشكاوى ضد المحامين
        </h1>
        <p className="text-green-200 text-xl">
          الهيئة السعودية للمحامين | وزارة العدل
        </p>
        <p className="text-green-300 mt-3 text-sm">
          وفق نظام المحاماة م/38 واللائحة التنفيذية 1446هـ
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-6">
        <Link
          href="/auth/login"
          className="bg-white rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
        >
          <div className="text-4xl mb-4">🏛️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">دخول الموظفين</h2>
          <p className="text-gray-500 text-sm">
            للمحققين والمدعين العامين ولجنة التأديب والإدارة
          </p>
          <div className="mt-4 text-green-700 font-medium group-hover:text-green-900">
            تسجيل الدخول ←
          </div>
        </Link>

        <Link
          href="/auth/register"
          className="bg-white rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
        >
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">تقديم شكوى جديدة</h2>
          <p className="text-gray-500 text-sm">
            للمواطنين الراغبين في تقديم شكوى ضد محامٍ
          </p>
          <div className="mt-4 text-green-700 font-medium group-hover:text-green-900">
            ابدأ الآن ←
          </div>
        </Link>

        <Link
          href="/auth/login"
          className="bg-white rounded-2xl p-8 text-center shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 group"
        >
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">المساعد القانوني</h2>
          <p className="text-gray-500 text-sm">
            ذكاء اصطناعي يساعدك في صياغة شكواك وفهم حقوقك
          </p>
          <div className="mt-4 text-green-700 font-medium group-hover:text-green-900">
            استشر الآن ←
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-green-300 text-sm">
        <p>جميع الاتصالات مشفرة ومحمية | سياسة الخصوصية | شروط الاستخدام</p>
        <p className="mt-2">© {new Date().getFullYear()} الهيئة السعودية للمحامين. جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}
