import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import {
    Book,
    ShieldCheck,
    Truck,
    CreditCard,
    HelpCircle,
    MessageSquare,
    AlertTriangle,
    CheckCircle2,
    Users,
    Info,
    Scale,
    Ban,
    PenTool,
    Clock,
    DollarSign,
    Gamepad2,
    Lock
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

export default function HekayatyGuide() {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === 'ar';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b]">
            <SEO
                description="تعلم كيفية استخدام حكاياتي للكتاب والقراء. أدلة النشر، الشراء، الشحن، وقواعد المجتمع."
            />
            <Navbar />

            <div className="pt-32 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                            <Info className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">
                                {t("guide.pageTitle")}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-gradient mb-6 leading-tight">
                            {t("guide.title")}
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            {t("guide.subtitle")}
                        </p>
                        <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl inline-block">
                            <p className="text-sm text-amber-500 font-medium leading-relaxed">
                                ⚠️ {t("guide.disclaimer")}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-12"
                    >
                        {/* Section 1: Writers */}
                        <motion.section variants={itemVariants} className="glass-card rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <PenTool className="w-32 h-32" />
                            </div>

                            <h2 className="text-3xl font-serif font-bold text-primary mb-10 flex items-center gap-3">
                                <PenTool className="w-8 h-8" />
                                {t("guide.writers.title")}
                            </h2>

                            <div className="grid gap-10">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        {t("guide.writers.publishing.title")}
                                    </h3>
                                    <p className="text-muted-foreground ml-4 leading-relaxed">
                                        {t("guide.writers.publishing.desc")}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Book className="w-5 h-5 text-blue-500" />
                                        {t("guide.writers.ebooks.title")}
                                    </h3>
                                    <p className="text-muted-foreground ml-4 leading-relaxed">
                                        {t("guide.writers.ebooks.desc")}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Truck className="w-5 h-5 text-amber-500" />
                                        {t("guide.writers.physical.title")}
                                    </h3>
                                    <div className="ml-4 space-y-4">
                                        <p className="text-muted-foreground leading-relaxed">{t("guide.writers.physical.subtitle")}</p>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                                                <p className="font-bold text-green-500 text-sm mb-2">{t("guide.writers.physical.writerResponsible")}</p>
                                                <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                                                    <li>{t("guide.writers.physical.shipping")}</li>
                                                    <li>{t("guide.writers.physical.duration")}</li>
                                                </ul>
                                            </div>
                                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                                <p className="font-bold text-red-500 text-sm mb-2">{t("guide.writers.physical.hekayatyNotResponsible")}</p>
                                                <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                                                    <li>{t("guide.writers.physical.delays")}</li>
                                                    <li>{t("guide.writers.physical.damage")}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Info className="w-5 h-5 text-blue-400" />
                                        {t("guide.writers.shippingData.title")}
                                    </h3>
                                    <p className="text-sm text-muted-foreground ml-4 leading-relaxed">
                                        {t("guide.writers.shippingData.desc")}
                                    </p>
                                </div>

                                <div className="space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                                        <DollarSign className="w-5 h-5" />
                                        {t("guide.writers.earnings.title")}
                                    </h3>
                                    <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside ml-4">
                                        <li>{t("guide.writers.earnings.hold")}</li>
                                        <li>{t("guide.writers.earnings.commission")}</li>
                                        <li>{t("guide.writers.earnings.instant")}</li>
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Clock className="w-5 h-5 text-green-400" />
                                        {t("guide.writers.payout.title")}
                                    </h3>
                                    <p className="text-sm text-muted-foreground ml-4">
                                        {t("guide.writers.payout.desc")}
                                    </p>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 2: Readers */}
                        <motion.section variants={itemVariants} className="glass-card rounded-3xl p-8 md:p-12 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <Users className="w-32 h-32" />
                            </div>

                            <h2 className="text-3xl font-serif font-bold text-accent mb-10 flex items-center gap-3">
                                <Users className="w-8 h-8" />
                                {t("guide.readers.title")}
                            </h2>

                            <div className="grid gap-10">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <HelpCircle className="w-5 h-5 text-primary" />
                                        {t("guide.readers.beforeBuying.title")}
                                    </h3>
                                    <p className="text-muted-foreground ml-4 leading-relaxed">
                                        {t("guide.readers.beforeBuying.desc")}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Lock className="w-5 h-5 text-green-500" />
                                        {t("guide.readers.payment.title")}
                                    </h3>
                                    <p className="text-muted-foreground ml-4 leading-relaxed">
                                        {t("guide.readers.payment.desc")}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                        <Gamepad2 className="w-5 h-5 text-blue-500" />
                                        {t("guide.readers.receival.title")}
                                    </h3>
                                    <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside ml-4">
                                        <li>{t("guide.readers.receival.digital")}</li>
                                        <li>{t("guide.readers.receival.physical")}</li>
                                        <li>{t("guide.readers.receival.delay")}</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 3: Legal & Rules */}
                        <motion.section variants={itemVariants} className="space-y-8">
                            <div className="p-8 md:p-12 rounded-3xl bg-secondary/10 border border-secondary/20 relative">
                                <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
                                    <Scale className="w-8 h-8 text-primary" />
                                    {t("guide.legal.title")}
                                </h2>
                                <p className="text-muted-foreground leading-relaxed mb-6">
                                    {t("guide.legal.desc")}
                                </p>
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-sm font-bold text-red-500">
                                        ⚠️ {t("guide.legal.warning")}
                                    </p>
                                </div>
                            </div>

                            <div className="glass-card rounded-3xl p-8 md:p-12 border border-red-500/20 relative">
                                <h2 className="text-3xl font-serif font-bold text-red-500 mb-8 flex items-center gap-3">
                                    <AlertTriangle className="w-8 h-8" />
                                    {t("guide.community.title")}
                                </h2>

                                <div className="grid gap-8 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <h3 className="font-bold flex items-center gap-2 text-white">
                                            <MessageSquare className="w-5 h-5 text-blue-400" />
                                            {t("guide.community.chat.title")}
                                        </h3>
                                        <ul className="text-xs space-y-2 text-muted-foreground">
                                            <li>❌ {t("guide.community.chat.bullying")}</li>
                                            <li>❌ {t("guide.community.chat.racism")}</li>
                                            <li>❌ {t("guide.community.chat.sexual")}</li>
                                        </ul>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-bold flex items-center gap-2 text-white">
                                            <Ban className="w-5 h-5 text-red-400" />
                                            {t("guide.community.content.title")}
                                        </h3>
                                        <ul className="text-xs space-y-2 text-muted-foreground">
                                            <li>❌ {t("guide.community.content.stolen")}</li>
                                            <li>❌ {t("guide.community.content.illegal")}</li>
                                            <li>❌ {t("guide.community.content.public")}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* Final Agreement */}
                        <motion.div variants={itemVariants} className="text-center p-8 bg-primary/20 rounded-3xl border border-primary/30">
                            <h3 className="text-2xl font-bold mb-4">{t("guide.agreement.title")}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t("guide.agreement.desc")}
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
