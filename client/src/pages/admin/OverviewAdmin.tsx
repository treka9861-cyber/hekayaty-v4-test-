import { useAdminOverviewStats } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, BookOpen, ShoppingCart, DollarSign, PenTool, TrendingUp, BarChart3, Activity } from "lucide-react";

function StatCard({ title, value, icon: Icon, color, description }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    description?: string;
}) {
    return (
        <Card className={`glass-card border-white/10 bg-black/40 relative overflow-hidden`}>
            <div className={`absolute inset-0 opacity-5 ${color}`} />
            <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">{title}</p>
                        <p className="text-4xl font-black mt-1 text-foreground">{value.toLocaleString?.() ?? value}</p>
                        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
                    </div>
                    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function OverviewAdmin() {
    const { data: stats, isLoading } = useAdminOverviewStats();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    const statCards = [
        { title: "إجمالي المستخدمين", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-blue-500 text-blue-400", description: "جميع الحسابات المسجلة" },
        { title: "إجمالي الكتاب", value: stats?.totalWriters ?? 0, icon: PenTool, color: "bg-primary text-primary", description: "الكتاب والكتاب المتحققون" },
        { title: "إجمالي القصص", value: stats?.totalProducts ?? 0, icon: BookOpen, color: "bg-purple-500 text-purple-400", description: "القصص المنشورة والمسودات" },
        { title: "إجمالي الطلبيات", value: stats?.totalOrders ?? 0, icon: ShoppingCart, color: "bg-amber-500 text-amber-400", description: "كل الطلبيات على مر الوقت" },
        { title: "إيرادات المنصة", value: `${(stats?.totalRevenue ?? 0).toLocaleString()} EGP`, icon: DollarSign, color: "bg-green-500 text-green-400", description: "أرباح المبدعين المتولدة" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gradient">نظرة عامة على المنصة</h2>
                    <p className="text-muted-foreground text-sm">صحة المنصة في الوقت الفعلي والمقاييس الأساسية</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} />
                ))}
            </div>

            {/* Quick Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card border-white/10 bg-black/40">
                    <CardHeader className="border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">صحة المنصة</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {[
                            { label: "المستخدمون", value: stats?.totalUsers ?? 0, max: Math.max(stats?.totalUsers ?? 1, 1) },
                            { label: "الكتاب", value: stats?.totalWriters ?? 0, max: Math.max(stats?.totalUsers ?? 1, 1) },
                            { label: "القصص", value: stats?.totalProducts ?? 0, max: Math.max(stats?.totalProducts ?? 1, 1) },
                        ].map(({ label, value, max }) => (
                            <div key={label} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-bold text-foreground">{value.toLocaleString()}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/10 bg-black/40">
                    <CardHeader className="border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">ملخص الإيرادات</CardTitle>
                        </div>
                        <CardDescription>إجمالي أرباح المبدعين المتتبعة على المنصة</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-6xl font-black text-gradient">
                                {((stats?.totalRevenue ?? 0) / 100).toFixed(0)}
                            </p>
                            <p className="text-muted-foreground text-sm mt-2 font-medium uppercase tracking-widest">إجمالي المكتسب بالجنيه المصري</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">عبر {stats?.totalOrders ?? 0} طلب</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
