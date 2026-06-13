import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Crown, Plus, Sparkles, LayoutGrid, Users, TrendingUp, ArrowLeft,
  Edit2, Archive, Eye, MoreHorizontal, CheckCircle2, Zap, BookOpen,
  UserCheck, Clock, ShieldCheck, XCircle
} from "lucide-react";
import { PlanBuilder } from "./builder/PlanBuilder";

export function MembershipManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubDesc, setClubDesc] = useState("");
  const [activeTab, setActiveTab] = useState<"plans" | "subscribers">("plans");

  const { data: clubs, isLoading: isLoadingClubs } = useQuery({
    queryKey: ["membership-clubs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/memberships/clubs");
      return res.json();
    }
  });

  const club = clubs?.[0];

  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["membership-plans", club?.store_id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/memberships/plans?storeId=${club?.store_id}`);
      return res.json();
    },
    enabled: !!club?.store_id
  });

  const { data: subscribers, isLoading: isLoadingSubscribers } = useQuery({
    queryKey: ["membership-subscribers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/memberships/subscribers");
      return res.json();
    },
    enabled: !!club,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const approveSubMutation = useMutation({
    mutationFn: async (subId: number) => {
      const res = await apiRequest("POST", `/api/memberships/approve-subscription/${subId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-subscribers"] });
      toast({ title: "✅ Subscription Approved!", description: "Subscriber now has full access." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const createClubMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/memberships/clubs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-clubs"] });
      toast({ title: "✨ Club Created!", description: "Your Membership Club is live and ready for plans." });
    }
  });

  if (isLoadingClubs) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-zinc-500 text-sm">Loading memberships...</p>
      </div>
    );
  }

  if (isCreatingPlan && club) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setIsCreatingPlan(false)}
          className="text-zinc-400 hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Memberships
        </Button>
        <PlanBuilder clubId={club.id} onComplete={() => {
          setIsCreatingPlan(false);
          queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              العضويات والاشتراكات
            </span>
          </h2>
          <p className="text-zinc-500 mt-1 text-sm">قم ببناء مستويات اشتراك حصرية لجمهورك.</p>
        </div>
        {club && (
          <Button
            onClick={() => setIsCreatingPlan(true)}
            className="bg-amber-500 text-black hover:bg-amber-400 font-black gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
          >
            <Plus className="w-4 h-4" /> خطة جديدة
          </Button>
        )}
      </div>

      {/* No Club State */}
      {!club ? (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-black/50 to-amber-900/5 p-10">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-lg mx-auto text-center">
            <div className="w-24 h-24 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
              <Sparkles className="w-12 h-12 text-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              ابدأ نادي العضوية الخاص بك
            </h3>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              أنشئ تيار إيرادات متكرر من خلال تقديم مزايا حصرية ووصول رقمي واعتمادات مادية لأكبر معجبيك.
            </p>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-4 text-left mb-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">اسم النادي</label>
                <Input
                  placeholder="مثال: ملاذ القراء"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300">الوصف <span className="text-zinc-600 font-normal">(اختياري)</span></label>
                <Textarea
                  placeholder="عن ماذا يتحدث هذا النادي؟"
                  value={clubDesc}
                  onChange={e => setClubDesc(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <Button
              className="w-full py-6 text-base font-black bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
              disabled={!clubName.trim() || createClubMutation.isPending}
              onClick={() => createClubMutation.mutate({ name: clubName, description: clubDesc })}
            >
              {createClubMutation.isPending ? "جاري الإنشاء..." : "إنشاء النادي والبدء في البناء ←"}
            </Button>
          </div>

          {/* Feature hints */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto relative z-10">
            {[
              { icon: BookOpen, label: "وصول رقمي", desc: "كتب إلكترونية وصوتية غير محدودة" },
              { icon: Zap, label: "محتوى حصري", desc: "قصص وفصول للأعضاء فقط" },
              { icon: Users, label: "المجتمع", desc: "مجتمع خاص بالمشتركين" },
            ].map(f => (
              <div key={f.label} className="text-center p-3 rounded-xl bg-white/3 border border-white/8">
                <f.icon className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-zinc-300">{f.label}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: LayoutGrid, label: "الخطط النشطة", value: plans?.filter((p: any) => p.status === "active").length ?? 0, color: "text-amber-400", bg: "bg-amber-500/10" },
              { icon: Users, label: "المشتركون", value: subscribers?.length ?? 0, color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: Clock, label: "قيد الانتظار", value: subscribers?.filter((s: any) => s.status === "pending").length ?? 0, color: "text-orange-400", bg: "bg-orange-500/10" },
              { icon: CheckCircle2, label: "إجمالي الخطط", value: plans?.length ?? 0, color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map(stat => (
              <div key={stat.label} className="p-5 rounded-2xl bg-black/30 border border-white/8 flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs font-medium">{stat.label}</p>
                  <p className="text-xl font-black text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("plans")}
              className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", activeTab === "plans" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white")}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              الخطط
            </button>
            <button
              onClick={() => setActiveTab("subscribers")}
              className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === "subscribers" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white")}
            >
              <Users className="w-4 h-4" />
              المشتركون
              {(subscribers?.filter((s: any) => s.status === "pending").length ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                  {subscribers?.filter((s: any) => s.status === "pending").length}
                </span>
              )}
            </button>
          </div>

          {/* PLANS TAB */}
          {activeTab === "plans" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">خطط العضوية الخاصة بك</h3>
                <Button
                  onClick={() => setIsCreatingPlan(true)}
                  className="bg-amber-500 text-black hover:bg-amber-400 font-bold gap-2"
                >
                  <Plus className="w-4 h-4" /> خطة جديدة
                </Button>
              </div>

              {isLoadingPlans ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-72 bg-white/3 rounded-2xl animate-pulse border border-white/5" />
                  ))}
                </div>
              ) : (!plans || plans.length === 0) ? (
                <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl bg-white/2">
                  <Crown className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <h4 className="text-lg font-bold text-zinc-400 mb-2">لا توجد خطط بعد</h4>
                  <p className="text-zinc-600 text-sm mb-6 max-w-xs mx-auto">
                    قم بإنشاء مستوى العضوية الأول الخاص بك لبدء تقديم مزايا حصرية لجمهورك.
                  </p>
                  <Button
                    onClick={() => setIsCreatingPlan(true)}
                    className="bg-amber-500 text-black hover:bg-amber-400 font-bold"
                  >
                    <Plus className="w-4 h-4 mr-2" /> إنشاء الخطة الأولى
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {plans.map((plan: any) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBSCRIBERS TAB */}
          {activeTab === "subscribers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">إدارة المشتركين</h3>
                <p className="text-zinc-500 text-sm">{subscribers?.length ?? 0} إجمالي</p>
              </div>

              {isLoadingSubscribers ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-white/3 rounded-xl animate-pulse" />)}
                </div>
              ) : !subscribers || subscribers.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
                  <Users className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                  <h4 className="text-lg font-bold text-zinc-400 mb-2">لا يوجد مشتركون بعد</h4>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">بمجرد اشتراك القراء في خططك، سيظهرون هنا.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscribers.map((sub: any) => (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border transition-all",
                        sub.status === "pending"
                          ? "bg-orange-500/5 border-orange-500/20"
                          : "bg-black/30 border-white/8 hover:border-white/15"
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-white">
                        {(sub.user?.displayName || sub.user?.username || "?")[0].toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{sub.user?.displayName || sub.user?.username || "Unknown User"}</p>
                          <Badge
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest border shrink-0",
                              sub.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                              sub.status === "pending" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                              sub.status === "canceled" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                              "bg-zinc-800 text-zinc-500 border-zinc-700"
                            )}
                          >
                            {sub.status === "active" && <ShieldCheck className="w-2.5 h-2.5 mr-1" />}
                            {sub.status === "pending" && <Clock className="w-2.5 h-2.5 mr-1" />}
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {sub.plan && (
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.plan.color_theme || '#cca660' }} />
                              {sub.plan.name}
                            </span>
                          )}
                          <span className="text-xs text-zinc-600">
                            ينتهي في {new Date(sub.current_period_end).toLocaleDateString()}
                          </span>
                          {sub.payment_reference && (
                            <span className="text-xs text-zinc-600 font-mono">Ref: {sub.payment_reference}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {sub.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => approveSubMutation.mutate(sub.id)}
                          disabled={approveSubMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs gap-1.5 shrink-0"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          موافقة
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const color = plan.color_theme || "#cca660";
  const pricing = plan.pricing?.[0];

  return (
    <div
      className="relative rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl group"
      style={{ borderColor: `${color}30` }}
    >
      {/* Color accent bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="bg-black/60 backdrop-blur-xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-white text-lg truncate">{plan.name}</h3>
            </div>
            <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{plan.short_description || "لا يوجد وصف."}</p>
          </div>
          <Badge
            className={cn(
              "ml-2 shrink-0 text-[9px] font-black uppercase tracking-widest border",
              plan.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              plan.status === "archived" ? "bg-zinc-800 text-zinc-500 border-zinc-700" :
              "bg-amber-500/10 text-amber-400 border-amber-500/20"
            )}
          >
            {plan.status}
          </Badge>
        </div>

        {/* Price */}
        {pricing && (
          <div className="py-3 border-y border-white/8">
            <span className="text-2xl font-black text-white">
              £{(pricing.price_in_cents / 100).toFixed(0)}
            </span>
            <span className="text-zinc-500 text-sm ml-1">EGP / {pricing.billing_cycle}</span>
          </div>
        )}

        {/* Benefits preview */}
        {plan.benefits && plan.benefits.length > 0 && (
          <div className="space-y-1.5">
            {plan.benefits.slice(0, 3).map((b: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color }} />
                {b.name}
              </div>
            ))}
            {plan.benefits.length > 3 && (
              <p className="text-xs text-zinc-600 italic pl-5">+{plan.benefits.length - 3} مزايا أخرى</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs gap-1.5">
            <Edit2 className="w-3 h-3" /> تعديل
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
