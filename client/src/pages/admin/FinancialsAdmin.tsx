import { useState } from "react";
import { useAdminFinances } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, DollarSign, Wallet, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FinancialsAdmin() {
  const { t } = useTranslation();
  const { data: finances, isLoading, error } = useAdminFinances();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Wallet className="w-12 h-12 text-destructive opacity-50" />
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">فشل تحميل البيانات المالية</h3>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const { periods = [], currentSnapshot = { totalRev: 0, totalPayouts: 0 } } = finances || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white">الشؤون المالية للمنصة</h2>
        <p className="text-muted-foreground mt-1">
          مراقبة توزيع الإيرادات ورسوم المنصة ومدفوعات المبدعين.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات (كل الأوقات)</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-white">{currentSnapshot.totalRev.toLocaleString()} EGP</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-500" /> حجم المبيعات الإجمالي
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">مدفوعات المبدعين (كل الأوقات)</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-white">{currentSnapshot.totalPayouts.toLocaleString()} EGP</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-red-500" /> الأموال المسحوبة
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">رسوم المنصة المحتجزة</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-black text-white">
              {periods.reduce((acc: number, curr: any) => acc + curr.platform_fees, 0).toLocaleString()} EGP
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              حصة حكاياتي
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-white/5 bg-card/30 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">تفاصيل شهرية</h3>
          <p className="text-sm text-muted-foreground">لقطات مالية مجمعة حسب الفترة.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">الفترة</th>
                <th className="px-6 py-4 font-medium">الإيراد الإجمالي</th>
                <th className="px-6 py-4 font-medium">رسوم المنصة</th>
                <th className="px-6 py-4 font-medium">أرباح المبدعين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    لا توجد بيانات مالية متاحة بعد.
                  </td>
                </tr>
              ) : (
                periods.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{p.period}</td>
                    <td className="px-6 py-4 text-emerald-400 font-medium">+{p.total_revenue.toLocaleString()} EGP</td>
                    <td className="px-6 py-4 text-blue-400 font-medium">+{p.platform_fees.toLocaleString()} EGP</td>
                    <td className="px-6 py-4 text-white font-medium">{p.creator_payouts.toLocaleString()} EGP</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
