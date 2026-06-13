import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Crown, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Coins, Gift,
  ShieldCheck, Tag, BookOpen, Headphones, Package, Image as ImageIcon,
  Zap, Users, MessageSquare, Star, Eye, Globe, Lock, UserCheck,
  Palette, AlertTriangle, Rocket, Clock, ChevronDown, ChevronUp, X,
  Music, Layers, BookMarked, Video, FileText, Percent, ShoppingBag,
  CalendarClock, TrendingUp, Info
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
//  TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface PricingTier {
  billingCycle: "monthly" | "quarterly" | "semi_annual" | "annual";
  priceInCents: number;
  enabled: boolean;
}

interface BenefitConfig {
  id: string;
  type: string;
  categoryId: string;
  name: string;
  enabled: boolean;
  value: string;
  limitType: "unlimited" | "per_month" | "per_year" | "custom";
  limitValue: number | null;
  scopeType: "store" | "category" | "product_type" | "collection" | "series" | "universe" | "product";
  scopeTargetId: string;
  carryOver: boolean;
}

interface FormData {
  name: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  bannerUrl: string;
  colorTheme: string;
  status: "draft" | "active" | "archived";
  visibility: "public" | "private" | "invite";
  pricing: PricingTier[];
  benefits: BenefitConfig[];
}

const BILLING_CYCLES = [
  {
    id: "monthly" as const,
    label: "شهري",
    duration: "1 month",
    savingsBase: 1,
    badge: null,
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/30",
    accent: "text-blue-400",
  },
  {
    id: "quarterly" as const,
    label: "ربع سنوي",
    duration: "3 months",
    savingsBase: 3,
    badge: "وفر 10%",
    color: "from-purple-500/20 to-purple-600/10",
    border: "border-purple-500/30",
    accent: "text-purple-400",
  },
  {
    id: "semi_annual" as const,
    label: "نصف سنوي",
    duration: "6 months",
    savingsBase: 6,
    badge: "وفر 20%",
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/30",
    accent: "text-amber-400",
  },
  {
    id: "annual" as const,
    label: "سنوي",
    duration: "12 months",
    savingsBase: 12,
    badge: "وفر 30%",
    color: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
  },
];

const BENEFIT_CATEGORIES = [
  {
    id: "digital_access",
    label: "الوصول الرقمي",
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    desc: "Grant readers unlimited or limited access to your digital library",
    benefits: [
      { id: "unlimited_ebooks", name: "Unlimited Ebooks", desc: "Access to all ebooks in your store" },
      { id: "unlimited_comics", name: "Unlimited Comics", desc: "Full comic library access" },
      { id: "unlimited_audiobooks", name: "Unlimited Audiobooks", desc: "Stream all audiobooks" },
      { id: "unlimited_digital", name: "All Digital Products", desc: "Access to all digital content types" },
      { id: "premium_content", name: "Premium Content Access", desc: "Early or exclusive premium releases" },
    ],
  },
  {
    id: "exclusive_content",
    label: "محتوى حصري",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    desc: "Share exclusive stories, chapters, and behind-the-scenes content",
    benefits: [
      { id: "exclusive_stories", name: "Exclusive Stories", desc: "Members-only original stories" },
      { id: "exclusive_chapters", name: "Exclusive Chapters", desc: "Preview chapters before release" },
      { id: "exclusive_comics", name: "Exclusive Comics", desc: "Members-only comic content" },
      { id: "bonus_content", name: "Bonus Content", desc: "Extra scenes and bonus material" },
      { id: "creator_notes", name: "Creator Notes", desc: "Author notes and writing insights" },
      { id: "behind_scenes", name: "Behind The Scenes", desc: "Creative process content" },
      { id: "premium_collections", name: "Premium Collections", desc: "Curated exclusive collections" },
    ],
  },
  {
    id: "community",
    label: "الوصول للمجتمع",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    desc: "Build a private community of dedicated readers and fans",
    benefits: [
      { id: "vip_community", name: "VIP Community", desc: "Access to private subscriber community" },
      { id: "subscriber_chat", name: "Subscriber Chat", desc: "Direct chat with creator and members" },
      { id: "private_discussions", name: "Private Discussions", desc: "Members-only discussion threads" },
      { id: "creator_events", name: "Creator Events", desc: "Exclusive virtual events and meetups" },
      { id: "exclusive_livestreams", name: "Exclusive Livestreams", desc: "Live sessions for subscribers" },
      { id: "premium_badge", name: "Premium Badge", desc: "Exclusive subscriber profile badge" },
      { id: "priority_support", name: "Priority Support", desc: "Faster response from creator" },
    ],
  },
  {
    id: "credits",
    label: "الأرصدة",
    icon: Coins,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    desc: "Issue monthly credits redeemable for physical or digital products",
    benefits: [
      { id: "physical_book_credit", name: "Physical Book Credit", desc: "Monthly credit for physical books" },
      { id: "ebook_credit", name: "Ebook Credit", desc: "Monthly credit for ebook purchases" },
      { id: "store_credit", name: "Store Credit", desc: "General store credit balance" },
      { id: "audiobook_credit", name: "Audiobook Credit", desc: "Monthly credit for audiobooks" },
    ],
  },
  {
    id: "discounts",
    label: "الخصومات",
    icon: Tag,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    desc: "Reward subscribers with automatic discounts on purchases",
    benefits: [
      { id: "store_discount", name: "Store-wide Discount", desc: "% discount on all store items" },
      { id: "physical_discount", name: "Physical Books Discount", desc: "% discount on physical products" },
      { id: "ebook_discount", name: "Ebook Discount", desc: "% discount on all ebooks" },
      { id: "audiobook_discount", name: "Audiobook Discount", desc: "% discount on audiobooks" },
    ],
  },
  {
    id: "early_access",
    label: "الوصول المبكر",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    desc: "Let subscribers read or buy content before everyone else",
    benefits: [
      { id: "early_releases", name: "Early Releases", desc: "Access new content days/weeks early" },
      { id: "beta_content", name: "Beta Content", desc: "Unfinished work-in-progress access" },
      { id: "advance_chapters", name: "Advance Chapters", desc: "Read chapters before they're published" },
    ],
  },
];

const SCOPE_TYPES = [
  { id: "store", label: "Entire Store", desc: "Applies to all content in your store" },
  { id: "category", label: "Specific Category", desc: "e.g. Novels, Comics, Sci-Fi" },
  { id: "product_type", label: "Product Type", desc: "e.g. Ebooks, Physical Books, Audiobooks" },
  { id: "collection", label: "Specific Collection", desc: "A curated collection of your works" },
  { id: "series", label: "Specific Series", desc: "A book series you manage" },
  { id: "universe", label: "Specific Universe", desc: "A fictional universe / world" },
  { id: "product", label: "Specific Product", desc: "A single book or product" },
];

const LIMIT_OPTIONS = [
  { id: "unlimited", label: "Unlimited", value: null },
  { id: "per_month_1", label: "1 Per Month", limitType: "per_month", value: 1 },
  { id: "per_month_2", label: "2 Per Month", limitType: "per_month", value: 2 },
  { id: "per_month_5", label: "5 Per Month", limitType: "per_month", value: 5 },
  { id: "per_month_10", label: "10 Per Month", limitType: "per_month", value: 10 },
  { id: "per_month_20", label: "20 Per Month", limitType: "per_month", value: 20 },
  { id: "per_month_50", label: "50 Per Month", limitType: "per_month", value: 50 },
  { id: "custom", label: "Custom Amount", limitType: "per_month", value: null },
];

const STEP_LABELS = [
  "المعلومات الأساسية",
  "التسعير",
  "المزايا",
  "الحدود",
  "النطاقات",
  "معاينة",
  "نشر",
];

const DEFAULT_FORM: FormData = {
  name: "",
  shortDescription: "",
  fullDescription: "",
  thumbnailUrl: "",
  bannerUrl: "",
  colorTheme: "#cca660",
  status: "draft",
  visibility: "public",
  pricing: [
    { billingCycle: "monthly", priceInCents: 0, enabled: true },
    { billingCycle: "quarterly", priceInCents: 0, enabled: false },
    { billingCycle: "semi_annual", priceInCents: 0, enabled: false },
    { billingCycle: "annual", priceInCents: 0, enabled: false },
  ],
  benefits: [],
};

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export function PlanBuilder({ clubId, onComplete }: { clubId?: number; onComplete?: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedBenefits, setExpandedBenefits] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/memberships/plans", { ...data, clubId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "🎉 Plan Published!", description: "Your membership tier is now live." });
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      if (onComplete) onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const goTo = (s: Step) => setStep(s);
  const nextStep = () => setStep(prev => Math.min(prev + 1, 7) as Step);
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1) as Step);

  const toggleCategory = (catId: string) =>
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));

  const toggleBenefitExpand = (bId: string) =>
    setExpandedBenefits(prev => ({ ...prev, [bId]: !prev[bId] }));

  const isBenefitEnabled = (benefitId: string) =>
    formData.benefits.some(b => b.id === benefitId && b.enabled);

  const toggleBenefit = (catId: string, benefitId: string, name: string) => {
    setFormData(prev => {
      const exists = prev.benefits.find(b => b.id === benefitId);
      if (exists) {
        return { ...prev, benefits: prev.benefits.map(b => b.id === benefitId ? { ...b, enabled: !b.enabled } : b) };
      }
      return {
        ...prev,
        benefits: [
          ...prev.benefits,
          {
            id: benefitId,
            type: benefitId,
            categoryId: catId,
            name,
            enabled: true,
            value: "",
            limitType: "unlimited",
            limitValue: null,
            scopeType: "store",
            scopeTargetId: "",
            carryOver: false,
          }
        ]
      };
    });
  };

  const updateBenefit = (benefitId: string, updates: Partial<BenefitConfig>) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map(b => b.id === benefitId ? { ...b, ...updates } : b)
    }));
  };

  const updatePricing = (cycleId: string, updates: Partial<PricingTier>) => {
    setFormData(prev => ({
      ...prev,
      pricing: prev.pricing.map(p => p.billingCycle === cycleId ? { ...p, ...updates } : p)
    }));
  };

  const enabledBenefits = formData.benefits.filter(b => b.enabled);

  const monthlyCost = formData.pricing.find(p => p.billingCycle === "monthly" && p.enabled)?.priceInCents ?? 0;

  const getSavings = (cycle: typeof BILLING_CYCLES[number]) => {
    if (!monthlyCost || cycle.id === "monthly") return null;
    const normalCost = monthlyCost * cycle.savingsBase;
    const tier = formData.pricing.find(p => p.billingCycle === cycle.id);
    if (!tier?.enabled || !tier.priceInCents) return null;
    const saving = normalCost - tier.priceInCents;
    if (saving <= 0) return null;
    const pct = Math.round((saving / normalCost) * 100);
    return { saving: (saving / 100).toFixed(0), pct };
  };

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!formData.name.trim()) issues.push("Plan name is required");
    if (!formData.shortDescription.trim()) issues.push("Short description is required");
    const activePricing = formData.pricing.filter(p => p.enabled && p.priceInCents > 0);
    if (activePricing.length === 0) issues.push("At least one pricing option must be configured");
    if (enabledBenefits.length === 0) issues.push("At least one benefit must be enabled");
    return issues;
  }, [formData, enabledBenefits]);

  // ── RENDER ──────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full text-white">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
          <Sparkles className="w-3 h-3" /> منشئ الخطط
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent mb-2">
          منشئ خطة العضوية
        </h1>
        <p className="text-zinc-400 text-base">قم بتصميم مستوى اشتراك متميز في دقائق.</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator step={step} onGoTo={goTo} />

      {/* Main Card */}
      <div className="bg-black/50 border border-white/8 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl mt-8">

        <div className="p-6 sm:p-8 min-h-[480px]">

          {/* ─── STEP 1: BASIC INFO ─── */}
          {step === 1 && (
            <StepWrapper title="المعلومات الأساسية" desc="امنح مستوى عضويتك اسماً وهُوية مميزة.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <FieldGroup label="اسم الخطة *" hint="اجعله لا يُنسى - مثل 'كبار الشخصيات الذهبية'، 'دائرة القراء الأوائل'">
                    <Input
                      placeholder="مثال: مستوى المبدع الذهبي"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/5 border-white/10 text-white text-lg py-6 placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                    />
                  </FieldGroup>

                  <FieldGroup label="وصف قصير *" hint="1-2 جمل. يظهر في بطاقات التسعير.">
                    <Input
                      placeholder="تجربة القراءة المطلقة..."
                      value={formData.shortDescription}
                      onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
                    />
                  </FieldGroup>

                  <FieldGroup label="الوصف الكامل" hint="يظهر على صفحة العضوية في متجرك.">
                    <Textarea
                      placeholder="صِف كل شيء متضمن: وصول حصري، دعم كبار العملاء، أرصدة شهرية..."
                      value={formData.fullDescription}
                      onChange={e => setFormData({ ...formData, fullDescription: e.target.value })}
                      rows={4}
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 resize-none"
                    />
                  </FieldGroup>

                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="لون السمة">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={formData.colorTheme}
                            onChange={e => setFormData({ ...formData, colorTheme: e.target.value })}
                            className="w-14 h-14 rounded-xl cursor-pointer border-2 border-white/10 bg-transparent p-1"
                          />
                        </div>
                        <div>
                          <Input
                            value={formData.colorTheme}
                            onChange={e => setFormData({ ...formData, colorTheme: e.target.value })}
                            className="bg-white/5 border-white/10 font-mono uppercase text-sm w-32"
                          />
                          <p className="text-xs text-zinc-600 mt-1">كود اللون السداسي (Hex)</p>
                        </div>
                      </div>
                    </FieldGroup>

                    <FieldGroup label="حالة الخطة">
                      <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="draft">📝 مسودة</SelectItem>
                          <SelectItem value="active">✅ نشط</SelectItem>
                          <SelectItem value="archived">📦 مؤرشف</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  <FieldGroup label="الرؤية">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "public", icon: Globe, label: "عام", desc: "يمكن لأي شخص رؤيتها" },
                        { id: "private", icon: Lock, label: "خاص", desc: "مخفي من البحث" },
                        { id: "invite", icon: UserCheck, label: "بدعوة فقط", desc: "عن طريق الدعوة" },
                      ].map(v => (
                        <button
                          key={v.id}
                          onClick={() => setFormData({ ...formData, visibility: v.id as any })}
                          className={cn(
                            "p-3 rounded-xl border-2 text-center transition-all duration-200 cursor-pointer",
                            formData.visibility === v.id
                              ? "border-amber-500 bg-amber-500/10 text-amber-200"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                          )}
                        >
                          <v.icon className="w-4 h-4 mx-auto mb-1" />
                          <p className="text-xs font-bold">{v.label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{v.desc}</p>
                        </button>
                      ))}
                    </div>
                  </FieldGroup>
                </div>

                {/* Right: Upload + Live Mini Preview */}
                <div className="space-y-5">
                  <FieldGroup label="صورة مصغرة">
                    <CloudinaryUpload
                      label="رفع صورة مصغرة"
                      aspectRatio="square"
                      folder="hekayaty_memberships"
                      onUpload={(url: string) => setFormData({ ...formData, thumbnailUrl: url })}
                    />
                  </FieldGroup>

                  <FieldGroup label="معاينة مباشرة">
                    <MiniPlanPreview formData={formData} />
                  </FieldGroup>
                </div>
              </div>
            </StepWrapper>
          )}

          {/* ─── STEP 2: PRICING ─── */}
          {step === 2 && (
            <StepWrapper title="الفواتير والتسعير" desc="تكوين أسعار الاشتراك. قم بتمكين دورات فوترة متعددة مع عرض تلقائي للمدخرات.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BILLING_CYCLES.map(cycle => {
                  const pricingTier = formData.pricing.find(p => p.billingCycle === cycle.id)!;
                  const savings = getSavings(cycle);
                  return (
                    <div
                      key={cycle.id}
                      className={cn(
                        "rounded-2xl border-2 overflow-hidden transition-all duration-300",
                        pricingTier.enabled
                          ? `bg-gradient-to-br ${cycle.color} ${cycle.border} shadow-lg`
                          : "bg-white/3 border-white/8 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between p-5 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-bold text-lg", pricingTier.enabled ? "text-white" : "text-zinc-500")}>{cycle.label}</h3>
                            {cycle.badge && pricingTier.enabled && (
                              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full border", cycle.accent, cycle.border, `bg-transparent`)}>
                                {cycle.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">يُفوتر كل {cycle.duration.replace("month", "شهر").replace("months", "أشهر")}</p>
                        </div>
                        <Switch
                          checked={pricingTier.enabled}
                          onCheckedChange={v => updatePricing(cycle.id, { enabled: v })}
                          className="data-[state=checked]:bg-amber-500"
                        />
                      </div>

                      {pricingTier.enabled && (
                        <div className="px-5 pb-5 space-y-3">
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-lg font-bold">£</span>
                            <Input
                              type="number"
                              placeholder="0"
                              value={pricingTier.priceInCents > 0 ? (pricingTier.priceInCents / 100) : ""}
                              onChange={e => updatePricing(cycle.id, { priceInCents: parseFloat(e.target.value) * 100 || 0 })}
                              className="bg-black/40 border-white/10 text-white text-2xl py-7 pl-10 font-mono placeholder:text-zinc-700 focus:border-amber-500/50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">EGP</span>
                          </div>

                          {savings && (
                            <div className={cn("flex items-center gap-2 text-sm font-bold", cycle.accent)}>
                              <TrendingUp className="w-4 h-4" />
                              يوفر المشتركون {savings.saving} ج.م ({savings.pct}%) مقارنة بالشهري
                            </div>
                          )}

                          {cycle.id !== "monthly" && monthlyCost > 0 && !savings && pricingTier.priceInCents > 0 && (
                            <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                              <Info className="w-3 h-3" />
                              قم بتعيين السعر أقل من {((monthlyCost * cycle.savingsBase) / 100).toFixed(0)} ج.م لإظهار التوفير
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-400">
                  <span className="text-amber-300 font-bold">نصيحة:</span> تقديم فواتير سنوية بخصم 25-30% يزيد بشكل كبير من القيمة الدائمة للمشترك. الفواتير الشهرية هي الأساس.
                </p>
              </div>
            </StepWrapper>
          )}

          {/* ─── STEP 3: BENEFITS ─── */}
          {step === 3 && (
            <StepWrapper title="منشئ المزايا" desc="اختر المزايا المضمنة في هذا المستوى. قم بتبديل الفئات للتوسيع وتحديد المزايا الفردية.">
              <div className="space-y-4">
                {BENEFIT_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isExpanded = expandedCategories[cat.id];
                  const enabledCount = formData.benefits.filter(b => b.categoryId === cat.id && b.enabled).length;

                  return (
                    <div key={cat.id} className={cn("rounded-2xl border-2 overflow-hidden transition-all duration-300", isExpanded ? `${cat.border} bg-black/30` : "border-white/8 bg-white/3")}>
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("p-3 rounded-xl", cat.bg)}>
                            <Icon className={cn("w-5 h-5", cat.color)} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base">{cat.label}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">{cat.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {enabledCount > 0 && (
                            <span className={cn("text-xs font-black px-2.5 py-1 rounded-full border", cat.color, cat.border, cat.bg)}>
                              {enabledCount} نشط
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                        </div>
                      </button>

                      {/* Benefits List */}
                      {isExpanded && (
                        <div className="border-t border-white/8 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {cat.benefits.map(benefit => {
                            const isOn = isBenefitEnabled(benefit.id);
                            return (
                              <div
                                key={benefit.id}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                                  isOn ? `${cat.border} ${cat.bg}` : "border-white/8 bg-white/3 hover:bg-white/5"
                                )}
                                onClick={() => toggleBenefit(cat.id, benefit.id, benefit.name)}
                              >
                                <div className="flex-1 min-w-0 mr-3">
                                  <p className={cn("font-semibold text-sm", isOn ? "text-white" : "text-zinc-300")}>{benefit.name}</p>
                                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{benefit.desc}</p>
                                </div>
                                <Switch
                                  checked={isOn}
                                  onCheckedChange={() => toggleBenefit(cat.id, benefit.id, benefit.name)}
                                  onClick={e => e.stopPropagation()}
                                  className="data-[state=checked]:bg-amber-500 shrink-0"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {enabledBenefits.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-sm font-bold text-emerald-400 mb-2">✓ {enabledBenefits.length} مزية مختارة</p>
                  <div className="flex flex-wrap gap-2">
                    {enabledBenefits.map(b => (
                      <span key={b.id} className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">{b.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </StepWrapper>
          )}

          {/* ─── STEP 4: LIMITS ─── */}
          {step === 4 && (
            <StepWrapper title="منشئ الحدود" desc="ضع حدود الاستخدام لكل ميزة مُمكنة. اتركها بلا حدود للوصول الكامل.">
              {enabledBenefits.length === 0 ? (
                <EmptyState icon={Sparkles} title="لم يتم تحديد أي مزايا" desc="ارجع للخطوة 3 لإضافة المزايا أولاً." onAction={() => setStep(3)} actionLabel="← اختيار المزايا" />
              ) : (
                <div className="space-y-4">
                  {enabledBenefits.map(benefit => {
                    const cat = BENEFIT_CATEGORIES.find(c => c.id === benefit.categoryId);
                    const CatIcon = cat?.icon ?? Sparkles;
                    return (
                      <div key={benefit.id} className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
                        <div className="flex items-center justify-between p-5">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", cat?.bg ?? "bg-white/10")}>
                              <CatIcon className={cn("w-4 h-4", cat?.color ?? "text-white")} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{benefit.name}</p>
                              <p className="text-xs text-zinc-500 capitalize">{benefit.categoryId.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-bold px-2.5 py-1 rounded-full",
                              benefit.limitType === "unlimited" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {benefit.limitType === "unlimited" ? "غير محدود" : `${benefit.limitValue ?? "?"} / ${benefit.limitType.replace("per_month", "شهرياً").replace("per_year", "سنوياً")}`}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-white/8 p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Limit Selector */}
                          <div className="space-y-2">
                            <Label className="text-zinc-300">حد الاستخدام</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {["unlimited", "per_month"].map(lt => (
                                <button
                                  key={lt}
                                  onClick={() => updateBenefit(benefit.id, { limitType: lt as any, limitValue: lt === "unlimited" ? null : benefit.limitValue })}
                                  className={cn(
                                    "py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                                    benefit.limitType === lt ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                                  )}
                                >
                                  {lt === "unlimited" ? "غير محدود" : "شهرياً"}
                                </button>
                              ))}
                            </div>

                            {benefit.limitType !== "unlimited" && (
                              <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs">الكمية لكل فترة</Label>
                                <div className="flex flex-wrap gap-2">
                                  {[1, 2, 5, 10, 20, 50].map(v => (
                                    <button
                                      key={v}
                                      onClick={() => updateBenefit(benefit.id, { limitValue: v })}
                                      className={cn(
                                        "w-10 h-10 rounded-lg border text-sm font-bold transition-all",
                                        benefit.limitValue === v ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-white/10 bg-white/5 text-zinc-400"
                                      )}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                <Input
                                  type="number"
                                  placeholder="كمية مخصصة..."
                                  value={benefit.limitValue ?? ""}
                                  onChange={e => updateBenefit(benefit.id, { limitValue: parseInt(e.target.value) || null })}
                                  className="bg-black/40 border-white/10 text-white w-40 mt-2"
                                />
                              </div>
                            )}
                          </div>

                          {/* Value field (for discounts/credits) */}
                          {(benefit.categoryId === "discounts" || benefit.categoryId === "credits") && (
                            <div className="space-y-2">
                              <Label className="text-zinc-300">
                                {benefit.categoryId === "discounts" ? "نسبة الخصم (%):" : "مبلغ الرصيد (ج.م):"}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder={benefit.categoryId === "discounts" ? "e.g. 20" : "e.g. 100"}
                                  value={benefit.value}
                                  onChange={e => updateBenefit(benefit.id, { value: e.target.value })}
                                  className="bg-black/40 border-white/10 text-white pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                                  {benefit.categoryId === "discounts" ? "%" : "EGP"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </StepWrapper>
          )}

          {/* ─── STEP 5: SCOPES ─── */}
          {step === 5 && (
            <StepWrapper title="نطاقات المزايا" desc="حدد أين تنطبق كل ميزة. تحكم بدقة في المحتوى المغطى — المتجر بأكمله أو عناصر محددة.">
              {enabledBenefits.length === 0 ? (
                <EmptyState icon={Layers} title="لا توجد مزايا لتحديد النطاق" desc="ارجع للخطوة 3 لإضافة المزايا أولاً." onAction={() => setStep(3)} actionLabel="← إضافة مزايا" />
              ) : (
                <div className="space-y-4">
                  {enabledBenefits.map(benefit => {
                    const cat = BENEFIT_CATEGORIES.find(c => c.id === benefit.categoryId);
                    const CatIcon = cat?.icon ?? Sparkles;
                    const isExpanded = expandedBenefits[benefit.id];
                    const currentScope = SCOPE_TYPES.find(s => s.id === benefit.scopeType);

                    return (
                      <div key={benefit.id} className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
                        <button
                          onClick={() => toggleBenefitExpand(benefit.id)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", cat?.bg ?? "bg-white/10")}>
                              <CatIcon className={cn("w-4 h-4", cat?.color ?? "text-white")} />
                            </div>
                            <div>
                              <p className="font-bold text-white">{benefit.name}</p>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                النطاق: <span className="text-amber-400 font-semibold">{currentScope?.label ?? "المتجر بأكمله"}</span>
                                {benefit.scopeTargetId && ` → "${benefit.scopeTargetId}"`}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/8 p-5 space-y-5">
                            <div>
                              <Label className="text-zinc-300 mb-3 block">أين تنطبق هذه الميزة؟</Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {SCOPE_TYPES.map(scope => (
                                  <button
                                    key={scope.id}
                                    onClick={() => updateBenefit(benefit.id, { scopeType: scope.id as any, scopeTargetId: scope.id === "store" ? "" : benefit.scopeTargetId })}
                                    className={cn(
                                      "p-3 rounded-xl border text-left transition-all duration-200",
                                      benefit.scopeType === scope.id
                                        ? "border-amber-500 bg-amber-500/10"
                                        : "border-white/8 bg-white/3 hover:border-white/15"
                                    )}
                                  >
                                    <p className={cn("text-sm font-bold", benefit.scopeType === scope.id ? "text-amber-200" : "text-zinc-300")}>{scope.label}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{scope.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {benefit.scopeType !== "store" && (
                              <div className="space-y-2">
                                <Label className="text-zinc-300">
                                  {benefit.scopeType === "category" && "اسم الفئة"}
                                  {benefit.scopeType === "product_type" && "نوع المنتج"}
                                  {benefit.scopeType === "collection" && "اسم أو رقم المجموعة"}
                                  {benefit.scopeType === "series" && "اسم السلسلة"}
                                  {benefit.scopeType === "universe" && "اسم الكون"}
                                  {benefit.scopeType === "product" && "رقم أو اسم المنتج"}
                                </Label>
                                <Input
                                  placeholder={
                                    benefit.scopeType === "category" ? "مثال: روايات، كوميكس، خيال..." :
                                    benefit.scopeType === "product_type" ? "مثال: إلكتروني، مادي، صوتي..." :
                                    benefit.scopeType === "collection" ? "مثال: مجموعة صيف 2024..." :
                                    benefit.scopeType === "series" ? "مثال: سلسلة العرش المكسور..." :
                                    benefit.scopeType === "universe" ? "مثال: كون الآثروورلد..." :
                                    "أدخل اسم المنتج أو رقمه..."
                                  }
                                  value={benefit.scopeTargetId}
                                  onChange={e => updateBenefit(benefit.id, { scopeTargetId: e.target.value })}
                                  className="bg-black/40 border-white/10 text-white focus:border-amber-500/50"
                                />
                                <p className="text-xs text-zinc-600">This benefit will only apply to the matching {benefit.scopeType.replace("_", " ")}.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </StepWrapper>
          )}

          {/* ─── STEP 6: PREVIEW ─── */}
          {step === 6 && (
            <StepWrapper title="معاينة مباشرة" desc="هكذا بالضبط كيف سيرى مشتركوك مستوى العضوية هذا.">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Plan Card */}
                <div className="flex-shrink-0 w-full max-w-sm mx-auto lg:mx-0">
                  <PlanCard formData={formData} />
                </div>

                {/* Summary */}
                <div className="flex-1 space-y-6">
                  <div className="p-5 rounded-2xl border border-white/10 bg-white/3 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" /> ملخص الخطة</h3>

                    <div className="space-y-3">
                      <SummaryRow label="اسم الخطة" value={formData.name || "—"} />
                      <SummaryRow label="الحالة" value={formData.status === "active" ? "نشط" : formData.status === "draft" ? "مسودة" : "مؤرشف"} />
                      <SummaryRow label="الرؤية" value={formData.visibility === "public" ? "عام" : formData.visibility === "private" ? "خاص" : "بدعوة"} />
                      <SummaryRow label="المزايا" value={`${enabledBenefits.length} مضبوطة`} />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-white/10 bg-white/3 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><Coins className="w-4 h-4 text-amber-400" /> مستويات التسعير</h3>
                    {formData.pricing.filter(p => p.enabled && p.priceInCents > 0).map(p => (
                      <div key={p.billingCycle} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <span className="text-zinc-400 capitalize text-sm">{p.billingCycle.replace("_", "-")}</span>
                        <span className="text-white font-bold">£{(p.priceInCents / 100).toFixed(0)} EGP</span>
                      </div>
                    ))}
                    {formData.pricing.filter(p => p.enabled && p.priceInCents > 0).length === 0 && (
                      <p className="text-zinc-600 text-sm italic">لم يتم تكوين أي تسعير بعد.</p>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl border border-white/10 bg-white/3 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> المزايا المضمنة</h3>
                    {enabledBenefits.length === 0 ? (
                      <p className="text-zinc-600 text-sm italic">لم يتم تحديد أي مزايا.</p>
                    ) : (
                      <div className="space-y-2">
                        {enabledBenefits.map(b => (
                          <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                            <span className="text-zinc-300">{b.name}</span>
                            <div className="flex items-center gap-2">
                              {b.value && <span className="text-amber-400 font-bold text-xs">{b.value}{b.categoryId === "discounts" ? "%" : b.categoryId === "credits" ? " EGP" : ""}</span>}
                              <span className="text-[10px] text-zinc-500">{b.limitType === "unlimited" ? "∞" : `${b.limitValue}/${b.limitType.replace("per_", "")}`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

          {/* ─── STEP 7: PUBLISH ─── */}
          {step === 7 && (
            <StepWrapper title="جاهز للنشر" desc="قم بالفحص النهائي وإطلاق مستوى العضوية الخاص بك.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Validation */}
                <div className="space-y-4">
                  <div className={cn(
                    "p-5 rounded-2xl border",
                    validationIssues.length === 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      {validationIssues.length === 0
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        : <AlertTriangle className="w-6 h-6 text-red-400" />
                      }
                      <h3 className={cn("font-bold text-lg", validationIssues.length === 0 ? "text-emerald-300" : "text-red-300")}>
                        {validationIssues.length === 0 ? "اجتازت جميع الفحوصات!" : `${validationIssues.length} مشكلة بحاجة للمعالجة`}
                      </h3>
                    </div>

                    {validationIssues.length > 0 ? (
                      <ul className="space-y-2">
                        {validationIssues.map((issue, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-red-300">
                            <X className="w-3.5 h-3.5 shrink-0" /> {issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-emerald-300/70">خطتك جاهزة للإطلاق. سيجعلها النشر متاحة لجمهورك فوراً.</p>
                    )}
                  </div>

                  {/* Checklist */}
                  <div className="p-5 rounded-2xl border border-white/10 bg-white/3 space-y-3">
                    <h3 className="font-bold text-white mb-1">قائمة مراجعة ما قبل الإطلاق</h3>
                    {[
                      { label: "للخطة اسم", ok: !!formData.name.trim() },
                      { label: "تم إضافة وصف قصير", ok: !!formData.shortDescription.trim() },
                      { label: "خيار تسعير واحد على الأقل مجهز", ok: formData.pricing.some(p => p.enabled && p.priceInCents > 0) },
                      { label: "ميزة واحدة ممكنة على الأقل", ok: enabledBenefits.length > 0 },
                      { label: "تم تكوين لون الخطة", ok: !!formData.colorTheme },
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {check.ok
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0" />
                        }
                        <span className={check.ok ? "text-zinc-300" : "text-zinc-500"}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Publish Actions */}
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-white/10 bg-white/3">
                    <h3 className="font-bold text-white mb-4">خيارات النشر</h3>
                    <div className="space-y-3">
                      <Button
                        onClick={() => createPlanMutation.mutate({ ...formData, status: "active" })}
                        disabled={validationIssues.length > 0 || createPlanMutation.isPending}
                        className="w-full py-6 text-base font-black bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all disabled:opacity-40"
                      >
                        <Rocket className="w-5 h-5 mr-2" />
                        {createPlanMutation.isPending ? "جاري النشر..." : "نشر الخطة الآن"}
                      </Button>

                      <Button
                        onClick={() => createPlanMutation.mutate({ ...formData, status: "draft" })}
                        disabled={!formData.name.trim() || createPlanMutation.isPending}
                        variant="outline"
                        className="w-full py-5 font-bold border-white/15 text-zinc-300 hover:bg-white/5 hover:text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        حفظ كمسودة
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full py-5 font-bold text-zinc-500 hover:text-zinc-300"
                        disabled
                      >
                        <CalendarClock className="w-4 h-4 mr-2" />
                        جدولة النشر (قريباً)
                      </Button>
                    </div>
                  </div>

                  {/* Quick plan card */}
                  <div className="hidden lg:block">
                    <MiniPlanPreview formData={formData} />
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

        </div>

        {/* Navigation Footer */}
        <div className="p-5 bg-black/30 border-t border-white/8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1}
            className="text-zinc-400 hover:text-white gap-2 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> رجوع
          </Button>

          <div className="text-xs text-zinc-600 font-medium">
            خطوة {step} من 7 — {STEP_LABELS[step - 1]}
          </div>

          {step < 7 ? (
            <Button
              onClick={nextStep}
              className="bg-amber-500 text-black hover:bg-amber-400 font-black px-8 gap-2 shadow-lg hover:shadow-amber-500/30 transition-all"
            >
              متابعة <ArrowRight className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function StepIndicator({ step, onGoTo }: { step: Step; onGoTo: (s: Step) => void }) {
  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="absolute top-5 left-0 w-full h-0.5 bg-white/10 rounded-full -z-10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 transition-all duration-700 ease-out"
          style={{ width: `${((step - 1) / 6) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          const isDone = step > s;
          const isCurrent = step === s;
          return (
            <button
              key={s}
              onClick={() => s < step && onGoTo(s)}
              disabled={s > step}
              className={cn("flex flex-col items-center gap-2 transition-all duration-300", s < step && "cursor-pointer hover:opacity-80")}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 shadow-md",
                isDone ? "bg-amber-500 border-amber-400 text-black shadow-amber-500/40" :
                isCurrent ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-amber-500/20" :
                "bg-zinc-900 border-zinc-700 text-zinc-600"
              )}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider hidden sm:block",
                isCurrent ? "text-amber-400" : isDone ? "text-zinc-400" : "text-zinc-700"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepWrapper({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-zinc-300 font-semibold">{label}</Label>
      {hint && <p className="text-xs text-zinc-600 -mt-1">{hint}</p>}
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, onAction, actionLabel }: any) {
  return (
    <div className="text-center py-16 px-8 bg-white/3 border-2 border-dashed border-white/10 rounded-2xl">
      <Icon className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
      <h3 className="font-bold text-lg text-zinc-400 mb-1">{title}</h3>
      <p className="text-zinc-600 mb-6 text-sm">{desc}</p>
      <Button variant="outline" onClick={onAction} className="border-white/20 text-zinc-300 hover:text-white">{actionLabel}</Button>
    </div>
  );
}

function MiniPlanPreview({ formData }: { formData: FormData }) {
  const activePricing = formData.pricing.find(p => p.enabled && p.priceInCents > 0);
  const enabledBenefits = formData.benefits.filter(b => b.enabled);
  const c = formData.colorTheme || "#cca660";

  return (
    <div
      className="relative rounded-2xl p-px overflow-hidden shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${c}80, transparent 60%, ${c}40)` }}
    >
      <div className="bg-zinc-950/95 backdrop-blur-xl rounded-[calc(1rem-1px)] p-6 flex flex-col gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
          style={{ backgroundColor: `${c}20`, border: `1px solid ${c}40` }}
        >
          <Crown className="w-6 h-6" style={{ color: c }} />
        </div>

        <div>
          <h3 className="text-xl font-black text-white">{formData.name || "Tier Name"}</h3>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{formData.shortDescription || "Your short description will appear here..."}</p>
        </div>

        {activePricing && (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">£{(activePricing.priceInCents / 100).toFixed(0)}</span>
            <span className="text-zinc-500 text-sm">EGP / {activePricing.billingCycle.replace("_", "-")}</span>
          </div>
        )}

        {enabledBenefits.length > 0 && (
          <div className="space-y-2">
            {enabledBenefits.slice(0, 4).map(b => (
              <div key={b.id} className="flex items-center gap-2 text-xs text-zinc-300">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${c}20` }}>
                  <CheckCircle2 className="w-2.5 h-2.5" style={{ color: c }} />
                </div>
                {b.name}
              </div>
            ))}
            {enabledBenefits.length > 4 && (
              <p className="text-xs text-zinc-600 pl-6">+{enabledBenefits.length - 4} more benefits</p>
            )}
          </div>
        )}

        <button
          className="w-full py-3 rounded-xl text-sm font-black mt-1 transition-all hover:opacity-90"
          style={{ backgroundColor: c, color: "#000" }}
        >
          Subscribe Now
        </button>
      </div>
    </div>
  );
}

function PlanCard({ formData }: { formData: FormData }) {
  const activePricingList = formData.pricing.filter(p => p.enabled && p.priceInCents > 0);
  const enabledBenefits = formData.benefits.filter(b => b.enabled);
  const c = formData.colorTheme || "#cca660";

  return (
    <div
      className="relative rounded-3xl p-px overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] hover:shadow-[0_0_80px_rgba(0,0,0,0.6)] transition-all duration-500"
      style={{ background: `linear-gradient(135deg, ${c}90, transparent 50%, ${c}50)` }}
    >
      {/* Banner */}
      {formData.bannerUrl && (
        <div className="absolute top-0 left-0 right-0 h-24 overflow-hidden rounded-t-[calc(1.5rem-1px)]">
          <img src={formData.bannerUrl} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/80" />
        </div>
      )}

      <div className="bg-zinc-950/95 backdrop-blur-2xl rounded-[calc(1.5rem-1px)] p-8 flex flex-col gap-5 relative">
        {/* Badge */}
        <div className="absolute top-5 right-5">
          <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest", formData.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700")}>
            {formData.status}
          </span>
        </div>

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ backgroundColor: `${c}20`, border: `2px solid ${c}50` }}
        >
          {formData.thumbnailUrl
            ? <img src={formData.thumbnailUrl} className="w-full h-full rounded-2xl object-cover" />
            : <Crown className="w-8 h-8" style={{ color: c }} />
          }
        </div>

        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">{formData.name || "Membership Tier"}</h2>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{formData.shortDescription || "Your tier's tagline will appear here."}</p>
        </div>

        {/* Pricing */}
        {activePricingList.length > 0 && (
          <div className="space-y-2">
            {activePricingList.map(p => (
              <div key={p.billingCycle} className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/5">
                <span className="text-zinc-400 text-sm capitalize">{p.billingCycle.replace("_", " ")}</span>
                <span className="text-white font-black">£{(p.priceInCents / 100).toFixed(0)} <span className="text-zinc-500 font-normal text-xs">EGP</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Benefits */}
        {enabledBenefits.length > 0 && (
          <div className="space-y-2.5 border-t border-white/8 pt-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: c }}>What's Included</p>
            {enabledBenefits.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${c}20` }}>
                    <CheckCircle2 className="w-3 h-3" style={{ color: c }} />
                  </div>
                  <span className="text-zinc-300 text-sm">{b.name}</span>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {b.limitType === "unlimited" ? "∞ Unlimited" : `${b.limitValue}/${b.limitType.replace("per_", "")}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          className="w-full py-5 rounded-2xl text-base font-black shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl mt-2"
          style={{ backgroundColor: c, color: "#000" }}
        >
          Subscribe Now
        </button>
      </div>
    </div>
  );
}
