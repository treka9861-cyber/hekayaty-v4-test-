import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, CheckCircle2, ShieldCheck, Sparkles, Tag, Coins, Loader2, Smartphone, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useUserSubscriptions } from "@/hooks/use-orders";
import { SubscriptionUpgradeModal } from "@/components/memberships/SubscriptionUpgradeModal";

export function StoreMemberships({ user, themeColor, hideHeader = false }: { user: any, themeColor: string, hideHeader?: boolean }) {
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<{ planId: number, pricingId: number, amount: number, name: string } | null>(null);
  const [upgradeSubscription, setUpgradeSubscription] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("instapay");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-membership-plans", user.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/memberships/plans?storeId=${user.id}`);
      return res.json();
    },
    enabled: !!user.id
  });

  const { data: userSubscriptions } = useUserSubscriptions();

  const handleSubscribeClick = (plan: any, pricing: any) => {
    // Check if user already has an active subscription to this creator
    const existingSub = userSubscriptions?.find((sub: any) => 
        sub.creator_id === user.id && sub.status === 'active'
    );

    if (existingSub) {
        // Even if they clicked a new plan, we open the Upgrade Modal with their existing subscription
        // The modal will allow them to choose target pricing.
        // We set the initial target to the one they clicked in the store.
        setUpgradeSubscription({ ...existingSub, _targetPricingId: pricing.id });
        return;
    }

    setCheckoutPlan({ 
        planId: plan.id, 
        pricingId: pricing.id, 
        amount: pricing.price_in_cents / 100,
        name: plan.name 
    });
    setReference("");
  };

  const handleConfirmSubscription = async () => {
    if (!checkoutPlan) return;
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/memberships/subscribe", {
        planId: checkoutPlan.planId,
        pricingId: checkoutPlan.pricingId,
        paymentMethod,
        paymentReference: reference
      });
      toast({
        title: t("writerStore.toastSuccessTitle"),
        description: t("writerStore.toastSuccessDesc"),
      });
      setCheckoutPlan(null);
    } catch (err: any) {
      toast({
        title: t("writerStore.toastFailTitle"),
        description: err.message || t("writerStore.toastFailDesc"),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentInstructions: Record<string, any> = {
      instapay: { title: t('checkout.payment.instapay', 'إنستاباي'), details: "التحويل إلى: 01272404623", icon: Smartphone, color: "text-purple-600", disabled: false },
      vodafone_cash: { title: `Vodafone Cash`, details: "Transfer to: 01000000000", icon: Smartphone, color: "text-red-600", disabled: false },
  };
  const selectedMethodInfo = paymentInstructions[paymentMethod] || paymentInstructions.instapay;

  if (isLoading) {
    return <div className="py-20 text-center animate-pulse text-zinc-500">Loading memberships...</div>;
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <Crown className="w-16 h-16 text-zinc-700 mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">{t("writerStore.noMembershipsTitle")}</h3>
        <p className="text-zinc-500 max-w-md">{t("writerStore.noMembershipsDesc")}</p>
      </div>
    );
  }

  // Map of billing cycle IDs to their UI representations
  const ALL_CYCLES = [
    { id: "monthly", label: t("writerStore.billingMonthly"), suffix: t("writerStore.suffixMo"), months: 1 },
    { id: "quarterly", label: t("writerStore.billingQuarterly"), suffix: t("writerStore.suffix3Mo"), months: 3 },
    { id: "semi_annual", label: t("writerStore.billingSemiAnnual"), suffix: t("writerStore.suffix6Mo"), months: 6 },
    { id: "annual", label: t("writerStore.billingAnnual"), suffix: t("writerStore.suffixYr"), months: 12 }
  ];

  // Only show cycles that are actually offered in at least one plan
  const availableCycles = ALL_CYCLES.filter(c => plans.some((p: any) => p.pricing?.some((pr: any) => pr.billing_cycle === c.id)));

  const renderCycleToggle = () => {
    if (availableCycles.length <= 1) return null;

    return (
      <div className="inline-flex items-center p-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-xl overflow-x-auto max-w-full">
        {availableCycles.map(cycle => (
          <button
            key={cycle.id}
            onClick={() => setBillingCycle(cycle.id)}
            className={`px-5 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              billingCycle === cycle.id 
                ? "bg-white text-black shadow-lg scale-100" 
                : "text-zinc-400 hover:text-white hover:bg-white/5 scale-95 hover:scale-100"
            }`}
          >
            {cycle.label}
            {cycle.id !== "monthly" && (
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black tracking-wider ${
                billingCycle === cycle.id ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-400"
              }`}>
                {t("writerStore.billingSave")}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={hideHeader ? "animate-in fade-in duration-700" : "py-10 animate-in fade-in duration-700"}>
      {!hideHeader && (
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">{t("writerStore.joinInnerCircle")}</h2>
          <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
            {t("writerStore.innerCircleDesc", { name: user.displayName })}
          </p>

          {renderCycleToggle()}
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end mb-8">
          {renderCycleToggle()}
        </div>
      )}

      {/* Store Exclusive Notice */}
      <div className="mb-10 flex justify-center px-4">
        <div className="inline-flex items-start sm:items-center gap-3 px-5 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl max-w-2xl backdrop-blur-sm">
          <div className="p-2 rounded-xl bg-[#cca660]/10 shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-5 h-5 text-[#cca660]" />
          </div>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed">
            <span className="font-bold text-zinc-200">{t("writerStore.storeExclusive")}</span> {t("writerStore.storeExclusiveDesc", { name: user.displayName })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan: any) => {
          const activePricing = plan.pricing?.find((p: any) => p.billing_cycle === billingCycle) || plan.pricing?.[0];
          
          if (!activePricing) return null;

          return (
            <div 
              key={plan.id}
              className="relative rounded-[2rem] p-[2px] overflow-hidden group hover:-translate-y-2 transition-all duration-500"
              style={{ background: `linear-gradient(135deg, ${plan.color_theme || themeColor}60, transparent, ${plan.color_theme || themeColor}40)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="bg-[#0a0a0a]/95 backdrop-blur-3xl h-full w-full rounded-[calc(2rem-2px)] p-8 relative z-10 flex flex-col">
                
                <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center shadow-lg" style={{ backgroundColor: `${plan.color_theme || themeColor}20`, border: `1px solid ${plan.color_theme || themeColor}50` }}>
                  <Crown className="w-8 h-8" style={{ color: plan.color_theme || themeColor }} />
                </div>

                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{plan.name}</h3>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed h-10">{plan.short_description}</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-bold tracking-tighter text-white">
                    £{(activePricing.price_in_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-zinc-500 font-medium ml-1">/ {ALL_CYCLES.find(c => c.id === billingCycle)?.suffix || 'mo'}</span>
                </div>

                <div className="space-y-5 mb-10 flex-grow">
                  {plan.benefits?.map((b: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 rounded-full p-1 shrink-0" style={{ backgroundColor: `${plan.color_theme || themeColor}20` }}>
                        <CheckCircle2 className="w-4 h-4" style={{ color: plan.color_theme || themeColor }} />
                      </div>
                      <div>
                        <span className="text-zinc-200 font-medium block">{b.name}</span>
                        {b.value && <span className="text-zinc-500 text-sm">{b.value}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => handleSubscribeClick(plan, activePricing)}
                  className="w-full py-6 text-lg font-bold rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  style={{ backgroundColor: plan.color_theme || themeColor, color: '#000' }}
                >
                  {t("writerStore.joinPlan", { plan: plan.name })}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* UPGRADE DIALOG */}
      {upgradeSubscription && (
        <SubscriptionUpgradeModal
            subscription={upgradeSubscription}
            plans={plans}
            isOpen={!!upgradeSubscription}
            onClose={() => setUpgradeSubscription(null)}
        />
      )}

      {/* CHECKOUT DIALOG */}
      <Dialog open={!!checkoutPlan} onOpenChange={(open) => !open && setCheckoutPlan(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-serif">
                    {t('checkout.secureCheckout', 'دفع آمن')}
                </DialogTitle>
                <DialogDescription>
                    Complete your subscription to {checkoutPlan?.name}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
                <div className="bg-muted p-4 rounded-lg border flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-primary" />
                        <span>{checkoutPlan?.name} Subscription</span>
                    </div>
                    <span className="font-bold">{checkoutPlan?.amount} {t('common.egp', 'ج.م')}</span>
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold">{t('checkout.selectMethod', 'اختر طريقة الدفع')}</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-3">
                        {Object.entries(paymentInstructions).map(([key, info]) => (
                            <div
                                key={key}
                                className={`flex items-center space-x-3 border p-3 rounded-lg transition-all ${info.disabled ? 'opacity-50 cursor-not-allowed bg-muted/20 grayscale' : 'cursor-pointer hover:bg-accent/5'} ${paymentMethod === key ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'}`}
                            >
                                <RadioGroupItem value={key} id={key} disabled={info.disabled} />
                                <Label htmlFor={key} className={`flex-1 flex items-center gap-2 font-medium ${info.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <info.icon className={`w-4 h-4 ${info.color}`} />
                                    {info.title}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="bg-muted p-4 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        {t('checkout.paymentInstructions', 'تعليمات الدفع')}
                    </h4>
                    <p className="text-sm font-medium mb-1">{t('checkout.transferAmount', { amount: checkoutPlan?.amount })}</p>
                    <p className="text-lg font-mono bg-background p-2 rounded border select-all text-center">
                        {selectedMethodInfo.details}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">{t('checkout.exactAmount', 'يرجى تحويل المبلغ بالكامل.')}</p>
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold">{t('checkout.verifyPayment', 'التحقق من الدفع')}</Label>
                    <div className="space-y-2">
                        <Label className="text-sm">{t('checkout.transactionRef', 'رقم المرجع للعملية')}</Label>
                        <Input placeholder={t('checkout.refPlaceholder', 'مثال: 1234567890')} value={reference} onChange={(e) => setReference(e.target.value)} />
                    </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                    <Button variant="ghost" onClick={() => setCheckoutPlan(null)}>{t('common.cancel', 'إلغاء')}</Button>
                    <Button
                        onClick={handleConfirmSubscription}
                        disabled={isSubmitting || !reference}
                        className="bg-primary hover:bg-primary/90 min-w-[140px]"
                    >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('checkout.processing', 'جاري المعالجة...')}</> : t('checkout.confirmPayment', 'تأكيد الدفع')}
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
