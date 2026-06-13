import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Shield, FileText, Lock, Scale, HelpCircle, Sparkles, PenTool, DollarSign, Edit2 } from "lucide-react";
import dashboardBg from "@/assets/9814ae82-9631-4241-a961-7aec31f9aa4d_09-11-19.png";
import { SEO } from "@/components/SEO";

export default function Legal() {
    const { i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    return (
        <div className="min-h-screen relative flex flex-col">
            <SEO
                title="سياسة الخصوصية والشروط | حكاياتي"
                description="الاتفاقيات القانونية لمتجر حكاياتي."
            />
            <Navbar />

            {/* Background */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${dashboardBg})` }}
            />
            <div className="fixed inset-0 z-0 bg-black/80 backdrop-blur-[4px]" />

            <div className="relative z-10 pt-32 pb-20 flex-grow">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 tracking-tight">
                            {isArabic ? "سياسة الخصوصية وشروط الاستخدام" : "Privacy Policy & Terms of Service"}
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            {isArabic
                                ? "دليلك لفهم كيفية حماية بياناتك وحقوقك داخل منصة حكاياتي."
                                : "Your guide to understanding how we protect your data and rights on Hekayaty."}
                        </p>
                    </motion.div>

                    {/* Privacy Policy */}
                    <section className="glass-card rounded-3xl p-8 md:p-12 mb-12 border border-white/10 relative overflow-hidden shadow-2xl backdrop-blur-md">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Shield size={120} />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-white">
                                {isArabic ? "سياسة الخصوصية – Privacy Policy" : "Privacy Policy"}
                            </h2>
                        </div>

                        <div className={`space-y-8 text-lg leading-relaxed text-muted-foreground ${isArabic ? 'font-arabic' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                            <p className="text-white/90">
                                {isArabic
                                    ? "مرحبًا بك في Hekayaty. نحن نحترم خصوصيتك ونلتزم بحماية بيانات المستخدمين. باستخدامك للمنصة، فإنك توافق على سياسة الخصوصية هذه بالكامل."
                                    : "Welcome to Hekayaty. We respect your privacy and are committed to protecting user data. By using the platform, you agree to this Privacy Policy in full."}
                            </p>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    {isArabic ? "1. البيانات التي نجمعها" : "1. Data We Collect"}
                                </h3>
                                <p className="mb-2">{isArabic ? "نقوم بجمع البيانات التالية فقط:" : "We collect the following data only:"}</p>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "بيانات التسجيل: الاسم، البريد الإلكتروني، كلمة المرور." : "Registration data: Name, email, password."}</li>
                                    <li>{isArabic ? "المحتوى الذي ينشره المستخدم (قصص، روايات، صور، نصوص)." : "User-published content (stories, novels, images, texts)."}</li>
                                    <li>{isArabic ? "بيانات الاستخدام: التفاعلات، المشاهدات، الأنشطة داخل المنصة." : "Usage data: Interactions, views, activities within the platform."}</li>
                                    <li className="text-primary font-bold">{isArabic ? "Hekayaty لا تجمع ولا تخزن أي بيانات دفع أو بيانات بنكية." : "Hekayaty does not collect or store any payment or bank data."}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    {isArabic ? "2. استخدام البيانات" : "2. Use of Data"}
                                </h3>
                                <p className="mb-2">{isArabic ? "تُستخدم البيانات للأغراض التالية:" : "Data is used for the following purposes:"}</p>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "إدارة الحسابات وتشغيل المنصة." : "Account management and platform operation."}</li>
                                    <li>{isArabic ? "تحسين تجربة المستخدم." : "Improving user experience."}</li>
                                    <li>{isArabic ? "إرسال إشعارات تقنية أو إدارية." : "Sending technical or administrative notifications."}</li>
                                    <li>{isArabic ? "التحليل الإحصائي الداخلي دون تحديد هوية المستخدم." : "Internal statistical analysis without identifying users."}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    {isArabic ? "3. حماية البيانات" : "3. Data Protection"}
                                </h3>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "يتم تأمين البيانات باستخدام تقنيات تشفير حديثة." : "Data is secured using modern encryption technologies."}</li>
                                    <li>{isArabic ? "لا نشارك البيانات مع أي طرف ثالث إلا إذا كان ذلك مطلوبًا قانونيًا." : "We do not share data with any third party unless legally required."}</li>
                                    <li>{isArabic ? "نتخذ إجراءات تقنية وتنظيمية لمنع الوصول غير المصرح به." : "We take technical and organizational measures to prevent unauthorized access."}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-primary" />
                                    {isArabic ? "4. حقوق المستخدم" : "4. User Rights"}
                                </h3>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "طلب الوصول إلى بياناته أو حذفها." : "Requesting access to or deletion of their data."}</li>
                                    <li>{isArabic ? "إيقاف الحساب في أي وقت." : "Deactivating the account at any time."}</li>
                                    <li>{isArabic ? "الاعتراض على أي استخدام غير قانوني للبيانات." : "Objecting to any illegal use of data."}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Terms of Service */}
                    <section className="glass-card rounded-3xl p-8 md:p-12 mb-12 border border-white/10 relative overflow-hidden shadow-2xl backdrop-blur-md">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Scale size={120} />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                <Scale className="w-6 h-6" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-white">
                                {isArabic ? "شروط الاستخدام – Terms of Service" : "Terms of Service"}
                            </h2>
                        </div>

                        <div className={`space-y-8 text-lg leading-relaxed text-muted-foreground ${isArabic ? 'font-arabic' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                            <p className="text-white/90">
                                {isArabic
                                    ? "باستخدامك لمنصة Hekayaty، فإنك توافق على جميع الشروط التالية دون أي استثناء."
                                    : "By using the Hekayaty platform, you agree to all of the following terms without exception."}
                            </p>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-primary" />
                                    {isArabic ? "1. طبيعة المنصة" : "1. Nature of the Platform"}
                                </h3>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "Hekayaty هي منصة وسيط تقني (Marketplace) فقط." : "Hekayaty is a technical intermediary platform (Marketplace) only."}</li>
                                    <li>{isArabic ? "المنصة لا تُنشئ، لا تُراجع، ولا تُدقق المحتوى المنشور." : "The platform does not create, review, or audit the published content."}</li>
                                    <li>{isArabic ? "دور المنصة يقتصر على إتاحة مساحة نشر وعرض المحتوى بين المستخدمين." : "The platform's role is limited to providing space for publishing and displaying content among users."}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-primary" />
                                    {isArabic ? "2. المسؤولية الكاملة عن المحتوى (إخلاء مسؤولية صريح)" : "2. Full Responsibility for Content (Explicit Disclaimer)"}
                                </h3>
                                <p className="mb-2">
                                    {isArabic
                                        ? "Hekayaty غير مسؤولة مسؤولية قانونية أو أخلاقية أو مالية عن أي محتوى يتم نشره على المنصة. المسؤولية الكاملة تقع على عاتق المستخدم الذي قام بنشر المحتوى ويشمل ذلك النصوص والقصص والصور والأغلفة."
                                        : "Hekayaty is not legally, morally, or financially responsible for any content published on the platform. Full responsibility lies with the user who published the content, including texts, stories, images, and covers."}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-primary" />
                                    {isArabic ? "3. المحتوى المسروق أو المخالف" : "3. Stolen or Violating Content"}
                                </h3>
                                <p className="mb-2">{isArabic ? "يُمنع منعًا باتًا نشر أي محتوى:" : "It is strictly forbidden to publish any content that is:"}</p>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "مسروق أو منسوخ." : "Stolen or copied."}</li>
                                    <li>{isArabic ? "ينتهك حقوق الملكية الفكرية." : "Violates intellectual property rights."}</li>
                                    <li>{isArabic ? "مخالف للقوانين أو الآداب العامة." : "Violates laws or public morals."}</li>
                                </ul>
                                <p className="mt-4 font-bold text-white">{isArabic ? "في حال اكتشاف أي انتهاك، تحتفظ Hekayaty بالحق في حذف المحتوى فورًا، حظر المستخدم نهائيًا، وإغلاق المتجر بدون أي تعويض." : "If any violation is detected, Hekayaty reserves the right to immediately delete the content, permanently ban the user, and close the store without any compensation."}</p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                    {isArabic ? "4. البيع والأرباح" : "4. Sales and Profits"}
                                </h3>
                                <p>
                                    {isArabic
                                        ? "بعد أول عملية بيع، يحصل المستخدم على 20% من الأرباح وفق نظام المنصة الداخلي. النسب قابلة للتعديل مستقبلًا مع إشعار المستخدمين."
                                        : "After the first sale, the user receives 20% of the profits according to the platform's internal system. Ratios are subject to future adjustment with user notification."}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-primary" />
                                    {isArabic ? "5. تحديد المسؤولية القانونية" : "5. Limitation of Legal Liability"}
                                </h3>
                                <ul className={`list-disc list-inside space-y-2 ${isArabic ? 'mr-4' : 'ml-4'}`}>
                                    <li>{isArabic ? "المنصة تُقدم “كما هي”." : "The platform is provided 'as is'."}</li>
                                    <li>{isArabic ? "Hekayaty غير مسؤولة عن أي خسائر مباشرة أو غير مباشرة أو نزاعات قانونية بين المستخدمين." : "Hekayaty is not responsible for any direct or indirect losses or legal disputes between users."}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    {isArabic ? "6. إساءة الاستخدام والتلاعب" : "6. Misuse and Manipulation"}
                                </h3>
                                <p>
                                    {isArabic
                                        ? "أي محاولة اختراق أو تحايل أو تلاعب بالنظام تُعد مخالفة جسيمة تؤدي إلى الحظر الدائم وإلغاء الحساب والمتجر واتخاذ الإجراءات القانونية."
                                        : "Any attempt to hack, circumvent, or manipulate the system is a gross violation leading to a permanent ban, cancellation of the account and store, and taking legal action."}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-primary" />
                                    {isArabic ? "7. التعديلات" : "7. Amendments"}
                                </h3>
                                <p>
                                    {isArabic
                                        ? "يحق لـ Hekayaty تعديل هذه الشروط في أي وقت، واستمرار استخدام المنصة يُعد موافقة صريحة على التعديلات."
                                        : "Hekayaty reserves the right to modify these terms at any time, and continued use of the platform constitutes explicit consent to the amendments."}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
