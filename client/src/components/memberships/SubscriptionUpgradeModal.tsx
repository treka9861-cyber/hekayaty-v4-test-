import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, Crown, Clock, ShieldCheck, Smartphone, CheckCircle2 } from "lucide-react";
import { useUpgradePreview, useUpgradeSubscription } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SubscriptionUpgradeModalProps {
    subscription: any;
    plans: any[];
    isOpen: boolean;
    onClose: () => void;
}

const ALL_CYCLES = [
    { id: "monthly", label: "Monthly", months: 1 },
    { id: "quarterly", label: "3 Months", months: 3 },
    { id: "semi_annual", label: "6 Months", months: 6 },
    { id: "annual", label: "Annual", months: 12 }
];

const paymentInstructions: Record<string, any> = {
    instapay: { title: 'Instapay', details: "Transfer to: 01272404623", icon: Smartphone, color: "text-purple-600", disabled: false },
    vodafone_cash: { title: 'Vodafone Cash', details: "Transfer to: 01000000000", icon: Smartphone, color: "text-red-600", disabled: false },
};

export function SubscriptionUpgradeModal({ subscription, plans, isOpen, onClose }: SubscriptionUpgradeModalProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [targetPricingId, setTargetPricingId] = useState<number | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState("instapay");
    const [reference, setReference] = useState("");

    const previewMutation = useUpgradePreview();
    const upgradeMutation = useUpgradeSubscription();

    // 1. Find current plan and pricing from the subscription
    const currentPlan = plans?.find(p => p.id === subscription?.plan_id);
    const currentPricingId = subscription?.pricing_id;
    const currentPricing = currentPlan?.pricing?.find((pr: any) => pr.id === currentPricingId);
    
    // Flatten all active pricings from ALL plans passed
    const allAvailablePricings = plans?.flatMap(p => p.pricing || [])
        .filter((pr: any) => pr.id !== currentPricingId && pr.is_active !== false) || [];
    
    // Group options by plan and then cycle
    const upgradeOptions = allAvailablePricings.map((pricing: any) => {
        const plan = plans?.find(p => p.id === pricing.plan_id);
        const cycle = ALL_CYCLES.find(c => c.id === pricing.billing_cycle);
        return {
            id: pricing.id,
            planName: plan?.name,
            cycleLabel: cycle?.label || pricing.billing_cycle,
            price: pricing.price_in_cents,
            pricing
        };
    }).sort((a, b) => a.price - b.price);

    const handleSelectTarget = (pricingId: number) => {
        setTargetPricingId(pricingId);
    };

    useEffect(() => {
        if (subscription?._targetPricingId && isOpen && step === 1 && !targetPricingId) {
            setTargetPricingId(subscription._targetPricingId);
            previewMutation.mutateAsync({
                subscriptionId: subscription.id,
                targetPricingId: subscription._targetPricingId
            }).then(data => {
                setPreviewData(data);
                setStep(2);
            }).catch(error => {
                toast({
                    title: "Failed to load preview",
                    description: error.message || "An error occurred",
                    variant: "destructive"
                });
            });
        }
    }, [subscription?._targetPricingId, isOpen]);

    const handlePreview = async () => {
        if (!targetPricingId) return;
        try {
            const data = await previewMutation.mutateAsync({
                subscriptionId: subscription.id,
                targetPricingId
            });
            setPreviewData(data);
            setStep(2);
        } catch (error: any) {
            toast({
                title: "Failed to load preview",
                description: error.message || "An error occurred",
                variant: "destructive"
            });
        }
    };

    const handleConfirm = async () => {
        if (!targetPricingId || !previewData) return;

        if (previewData.amountDueCents > 0 && !reference) {
             toast({ title: "Error", description: "Payment reference is required", variant: "destructive" });
             return;
        }

        try {
            await upgradeMutation.mutateAsync({
                subscriptionId: subscription.id,
                targetPricingId,
                paymentReference: previewData.amountDueCents > 0 ? reference : undefined,
                paymentProofUrl: undefined, // Not implemented in MVP
                paymentMethod: previewData.amountDueCents > 0 ? paymentMethod : undefined
            });
            setStep(3); // Success step
        } catch (error: any) {
             toast({
                title: "Upgrade Failed",
                description: error.message || "An error occurred",
                variant: "destructive"
            });
        }
    };

    const resetAndClose = () => {
        setStep(1);
        setTargetPricingId(null);
        setPreviewData(null);
        setReference("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
                        <Crown className="w-6 h-6 text-amber-400" />
                        Upgrade Subscription
                    </DialogTitle>
                    {step === 1 && <DialogDescription className="text-zinc-400">Select a new billing cycle for your current plan.</DialogDescription>}
                    {step === 2 && <DialogDescription className="text-zinc-400">Review your prorated upgrade cost.</DialogDescription>}
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
                            <p className="text-xs text-zinc-400 mb-1">Current Plan</p>
                            <h4 className="font-bold text-lg">{currentPlan?.name}</h4>
                            <p className="text-sm text-zinc-300 capitalize">{currentPricing?.billing_cycle} Cycle</p>
                            <p className="text-xs text-zinc-500 mt-2">Expires: {new Date(subscription?.current_period_end).toLocaleDateString()}</p>
                        </div>

                        <Label className="text-sm font-bold text-zinc-300">Available Upgrade Cycles</Label>
                        {upgradeOptions.length === 0 ? (
                            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10 text-zinc-400 text-sm">
                                No upgrade options available for this plan.
                            </div>
                        ) : (
                            <div className="grid gap-3 mt-2">
                                {upgradeOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelectTarget(opt.pricing.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                            targetPricingId === opt.pricing.id 
                                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                                                : 'bg-white/5 border-white/10 hover:border-white/20 text-white'
                                        }`}
                                    >
                                        <span className="font-bold">{opt.planName} - {opt.cycleLabel}</span>
                                        <span className="font-mono">{(opt.pricing.price_in_cents / 100).toFixed(0)} EGP</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button variant="ghost" onClick={resetAndClose} className="text-zinc-400 hover:text-white">Cancel</Button>
                            <Button 
                                onClick={handlePreview} 
                                disabled={!targetPricingId || previewMutation.isPending}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2"
                            >
                                {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                                {!previewMutation.isPending && <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === 2 && previewData && (
                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Current Plan Remaining Value</span>
                                <span className="font-mono text-emerald-400">-{previewData.creditCents / 100} EGP</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">New Plan Cost ({previewData.targetBillingCycle})</span>
                                <span className="font-mono">{previewData.targetPriceCents / 100} EGP</span>
                            </div>
                            
                            <div className="h-px bg-white/10 w-full my-2" />
                            
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white">Amount Due Today</span>
                                <span className="font-black text-2xl text-amber-400">{previewData.amountDueCents / 100} EGP</span>
                            </div>

                            {previewData.bonusDays > 0 && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-2 items-start mt-2">
                                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-emerald-300">
                                        Your remaining credit exceeds the new plan's cost. You'll pay nothing today and get <span className="font-bold">{previewData.bonusDays} bonus days</span> added to your new cycle!
                                    </p>
                                </div>
                            )}
                        </div>

                        {previewData.amountDueCents > 0 && (
                            <div className="space-y-4">
                                <Label className="text-sm font-bold text-zinc-300">Payment Method</Label>
                                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-2">
                                    {Object.entries(paymentInstructions).map(([key, info]) => (
                                        <div
                                            key={key}
                                            className={`flex items-center space-x-3 border p-3 rounded-lg transition-all cursor-pointer ${
                                                paymentMethod === key ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 bg-white/5'
                                            }`}
                                        >
                                            <RadioGroupItem value={key} id={key} />
                                            <Label htmlFor={key} className="flex-1 flex items-center gap-2 font-medium cursor-pointer">
                                                <info.icon className={`w-4 h-4 ${info.color}`} />
                                                {info.title}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>

                                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                                    <p className="text-sm text-zinc-300 mb-1">Transfer exactly</p>
                                    <p className="text-xl font-mono text-amber-400 font-bold mb-2">{previewData.amountDueCents / 100} EGP</p>
                                    <p className="font-mono text-sm bg-black/50 p-2 rounded select-all text-white border border-white/10">
                                        {paymentInstructions[paymentMethod].details}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm text-zinc-300">Transaction Reference Number</Label>
                                    <Input 
                                        placeholder="e.g. 1234567890" 
                                        value={reference} 
                                        onChange={(e) => setReference(e.target.value)}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)} className="text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button 
                                onClick={handleConfirm} 
                                disabled={upgradeMutation.isPending || (previewData.amountDueCents > 0 && !reference)}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold min-w-[140px]"
                            >
                                {upgradeMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                ) : (
                                    "Submit Request"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === 3 && (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center border border-amber-500/30">
                            <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-white">Request Submitted!</h3>
                        <p className="text-zinc-400">
                            Your upgrade request to the <span className="font-bold text-white capitalize">{previewData?.targetBillingCycle}</span> cycle has been submitted.
                            <br/><br/>
                            It is currently under admin review. Your current subscription remains active until the upgrade is approved.
                        </p>
                        <Button onClick={resetAndClose} className="mt-8 w-full bg-white/10 hover:bg-white/20 text-white">
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Sparkles icon fallback (using lucide-react if available, else a star)
function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  )
}
