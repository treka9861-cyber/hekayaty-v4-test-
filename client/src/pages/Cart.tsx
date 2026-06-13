import { useState, useEffect } from "react";
import { useCart, useRemoveFromCart, useCheckout, useCalculateShipping, useUpdateCartQuantity } from "@/hooks/use-cart";
import { useShippingAddresses } from "@/hooks/use-shipping";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ShoppingBag, CreditCard, Banknote, Smartphone, Truck, MapPin, Package, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Home } from "lucide-react";

type CheckoutGroup = "physical" | "digital";

export default function Cart() {
    const { t } = useTranslation();
    const { data: cartItems, isLoading } = useCart();
    const removeFromCart = useRemoveFromCart();
    const updateQuantity = useUpdateCartQuantity();
    const checkout = useCheckout();
    const [, setLocation] = useLocation();

    const [checkoutGroup, setCheckoutGroup] = useState<CheckoutGroup | null>(null);
    const [step, setStep] = useState(1);

    const calculateShipping = useCalculateShipping();
    const { data: userAddresses } = useShippingAddresses();
    const [shippingDetails, setShippingDetails] = useState({ fullName: "", phoneNumber: "", city: "", addressLine: "" });
    const [shippingCost, setShippingCost] = useState(0);
    const [shippingBreakdown, setShippingBreakdown] = useState<any[]>([]);

    const [paymentMethod, setPaymentMethod] = useState("instapay");
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [reference, setReference] = useState("");

    const validItems = cartItems?.filter((item: any) => item.product || item.collection) || [];
    const physicalItems = validItems.filter((item: any) => item.product?.requiresShipping);
    const digitalItems = validItems.filter((item: any) => !item.product?.requiresShipping && !item.collection);
    const collectionItems = validItems.filter((item: any) => !!item.collection);
    const allDigital = [...digitalItems, ...collectionItems];
    const hasPhysical = physicalItems.length > 0;
    const hasDigital = allDigital.length > 0;

    const physicalSubtotal = physicalItems.reduce((s: number, i: any) => s + (i.product?.salePrice || i.product?.price || 0) * (i.quantity || 1), 0);
    const digitalSubtotal = allDigital.reduce((s: number, i: any) => s + (i.product?.salePrice || i.product?.price || i.collection?.price || 0) * (i.quantity || 1), 0);

    const activeItems = checkoutGroup === "physical" ? physicalItems : allDigital;
    const activeSubtotal = checkoutGroup === "physical" ? physicalSubtotal : digitalSubtotal;
    const activeShippingCost = checkoutGroup === "physical" ? shippingCost : 0;
    const activeTotal = activeSubtotal + activeShippingCost;

    useEffect(() => {
        if (hasPhysical && userAddresses && userAddresses.length > 0 && shippingCost === 0 && !calculateShipping.isPending) {
            const latest = userAddresses[0];
            setShippingDetails({ fullName: latest.fullName, phoneNumber: latest.phoneNumber, city: latest.city, addressLine: latest.addressLine });
            const itemsForShipping = physicalItems.map((i: any) => ({ productId: i.productId, variantId: i.variantId, price: (i.product!.salePrice || i.product!.price), creatorId: i.product!.writerId }));
            if (itemsForShipping.length > 0) {
                calculateShipping.mutate({ items: itemsForShipping, city: latest.city.trim() }, {
                    onSuccess: (data) => { setShippingCost(data.total); setShippingBreakdown(data.breakdown); }
                });
            }
        }
    }, [hasPhysical, userAddresses, validItems.length]);

    const openCheckout = (group: CheckoutGroup) => {
        setCheckoutGroup(group);
        setStep(group === "physical" ? 1 : 2);
        setReference("");
        setProofUrl(null);
    };
    const closeCheckout = () => setCheckoutGroup(null);

    const handleCalculateShipping = () => {
        if (!shippingDetails.city) return;
        const itemsForShipping = physicalItems.map((i: any) => ({ productId: i.productId, variantId: i.variantId, price: (i.product!.salePrice || i.product!.price), creatorId: i.product!.writerId }));
        calculateShipping.mutate({ items: itemsForShipping, city: shippingDetails.city.trim() }, {
            onSuccess: (data) => { setShippingCost(data.total); setShippingBreakdown(data.breakdown); setStep(2); }
        });
    };

    const handleCheckoutSubmit = () => {
        if (activeItems.length === 0) return;
        const itemsPayload = activeItems.map((item: any) => ({
            productId: item.productId,
            collectionId: item.collectionId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.product?.salePrice || item.product?.price || item.collection?.price || 0,
            creatorId: item.product?.writerId || item.collection?.writerId || null,
            customizationData: item.customizationData
        }));
        checkout.mutate({
            items: itemsPayload,
            totalAmount: activeTotal,
            paymentMethod,
            paymentProofUrl: proofUrl,
            paymentReference: reference,
            shippingAddress: checkoutGroup === "physical" ? shippingDetails : undefined,
            shippingCost: checkoutGroup === "physical" ? shippingCost : undefined,
            shippingBreakdown: checkoutGroup === "physical" ? shippingBreakdown : undefined
        }, {
            onSuccess: () => { closeCheckout(); setLocation("/dashboard"); }
        });
    };

    const paymentInstructions: Record<string, any> = {
        instapay: { title: t('checkout.payment.instapay'), details: "التحويل إلى: 01272404623", icon: Smartphone, color: "text-purple-600", disabled: false },
        vodafone_cash: { title: `فودافون كاش (${t('common.soon')})`, details: t('common.integrationInProgress'), icon: Smartphone, color: "text-red-600", disabled: true },
        orange_cash: { title: `أورانج كاش (${t('common.soon')})`, details: t('common.integrationInProgress'), icon: Smartphone, color: "text-orange-600", disabled: true },
        etisalat_cash: { title: `اتصالات كاش (${t('common.soon')})`, details: t('common.integrationInProgress'), icon: Smartphone, color: "text-green-600", disabled: true },
        bank_transfer: { title: `${t('checkout.payment.card')} (${t('common.soon')})`, details: t('common.comingSoon'), icon: Banknote, color: "text-blue-600", disabled: true }
    };
    const selectedMethodInfo = paymentInstructions[paymentMethod];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 pt-32">
                <h1 className="text-4xl font-serif font-bold mb-8 flex items-center gap-3">
                    <ShoppingBag className="w-8 h-8 text-primary" />
                    {t('cart.yourCart', t('cart.title'))}
                </h1>

                {validItems.length === 0 ? (
                    <div className="glass-card p-12 text-center rounded-2xl">
                        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">{t('cart.empty')}</h2>
                        <p className="text-muted-foreground mb-8">{t('cart.emptyMessage', t('cart.emptySubtitle'))}</p>
                        <Link href="/marketplace">
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">{t('cart.browseStories', t('cart.browseTitles'))}</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-10">

                        {/* PHYSICAL SECTION */}
                        {hasPhysical && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-3">
                                    <div className="flex items-center gap-2 px-1 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-lg">
                                            <Truck className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">{t('cart.physicalProducts')}</h2>
                                            <p className="text-xs text-muted-foreground">{t('cart.requiresShipping')}</p>
                                        </div>
                                    </div>
                                    {physicalItems.map((item: any) => (
                                        <CartItemRow key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeFromCart} />
                                    ))}
                                </div>
                                <div>
                                    <div className="glass-card p-5 rounded-xl sticky top-24 border border-amber-500/10">
                                        <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-amber-500" />
                                            {t('cart.physicalSummary')}
                                        </h3>
                                        <div className="space-y-3 mt-4 text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{t('cart.subtotal')}</span>
                                                <span>{physicalSubtotal} {t('common.egp')}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{t('cart.shipping')}</span>
                                                <span>
                                                    {calculateShipping.isPending
                                                        ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t('cart.calculatingShipping')}</span>
                                                        : shippingCost > 0 ? `${shippingCost} ${t('common.egp')}` : t('cart.calculatedAtCheckout')}
                                                </span>
                                            </div>
                                            <div className="w-full h-px bg-border" />
                                            <div className="flex justify-between font-bold text-base">
                                                <span>{t('cart.total')}</span>
                                                <span>{physicalSubtotal + shippingCost} {t('common.egp')}</span>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold h-11"
                                            onClick={() => openCheckout("physical")}
                                        >
                                            <Truck className="w-4 h-4 mr-2" />
                                            {t('cart.checkoutPhysical')}
                                        </Button>
                                        <p className="text-[10px] text-center text-muted-foreground mt-3">{t('cart.includesShipping')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        {hasPhysical && hasDigital && (
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-border/50" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-widest">{t('cart.mixedCart')}</span>
                                </div>
                            </div>
                        )}

                        {/* DIGITAL SECTION */}
                        {hasDigital && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-3">
                                    <div className="flex items-center gap-2 px-1 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Download className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">{t('cart.digitalProducts')}</h2>
                                            <p className="text-xs text-muted-foreground">{t('cart.instantAccess')}</p>
                                        </div>
                                    </div>
                                    {allDigital.map((item: any) => (
                                        <CartItemRow key={item.id} item={item} onUpdate={updateQuantity} onRemove={removeFromCart} />
                                    ))}
                                </div>
                                <div>
                                    <div className="glass-card p-5 rounded-xl sticky top-24 border border-blue-500/10">
                                        <h3 className="font-bold text-base mb-1 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-blue-500" />
                                            {t('cart.digitalSummary')}
                                        </h3>
                                        <div className="space-y-3 mt-4 text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{t('cart.subtotal')}</span>
                                                <span>{digitalSubtotal} {t('common.egp')}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{t('cart.shipping')}</span>
                                                <span>{t('cart.shipping')} – {t('cart.digitalProducts')}</span>
                                            </div>
                                            <div className="w-full h-px bg-border" />
                                            <div className="flex justify-between font-bold text-base">
                                                <span>{t('cart.total')}</span>
                                                <span>{digitalSubtotal} {t('common.egp')}</span>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                                            onClick={() => openCheckout("digital")}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {t('cart.checkoutDigital')}
                                        </Button>
                                        <p className="text-[10px] text-center text-muted-foreground mt-3">{t('cart.includesFee')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* CHECKOUT DIALOG */}
                <Dialog open={!!checkoutGroup} onOpenChange={(open) => !open && closeCheckout()}>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-serif">
                                {step === 1 ? t('checkout.shippingDetails', t('checkout.shipping.title')) : t('checkout.secureCheckout', t('cart.checkout'))}
                            </DialogTitle>
                            <DialogDescription>
                                {step === 1
                                    ? t('checkout.whereToSend')
                                    : checkoutGroup === "physical"
                                        ? t('checkout.completePhysical')
                                        : t('checkout.completeDigital')}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Step 1: Shipping */}
                        {step === 1 && checkoutGroup === "physical" && (
                            <div className="space-y-4 mt-4">
                                <div className="bg-amber-500/10 p-4 rounded-lg flex gap-3 text-amber-600 border border-amber-500/20">
                                    <Truck className="w-5 h-5 shrink-0" />
                                    <p className="text-sm">{t('checkout.deliveryNote')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('checkout.fullName', t('checkout.shipping.fullName'))}</Label>
                                    <Input value={shippingDetails.fullName} onChange={(e) => setShippingDetails({ ...shippingDetails, fullName: e.target.value })} placeholder={t('checkout.receiverName')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('checkout.phoneNumber', t('checkout.shipping.phone'))}</Label>
                                    <Input value={shippingDetails.phoneNumber} onChange={(e) => setShippingDetails({ ...shippingDetails, phoneNumber: e.target.value })} placeholder="01xxxxxxxxx" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-base">
                                            <MapPin className="w-5 h-5 text-amber-500" />
                                            {t('checkout.cityGovernorat', t('checkout.shipping.city'))}
                                        </Label>
                                        <Input value={shippingDetails.city} onChange={(e) => setShippingDetails({ ...shippingDetails, city: e.target.value })} placeholder={t('checkout.cityPlaceholder')} className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-base">
                                            <Home className="w-6 h-6 text-amber-500" />
                                            {t('checkout.detailedAddress', t('checkout.shipping.address'))}
                                        </Label>
                                        <Textarea
                                            value={shippingDetails.addressLine}
                                            onChange={(e) => setShippingDetails({ ...shippingDetails, addressLine: e.target.value })}
                                            placeholder={t('checkout.addressPlaceholder')}
                                            className="min-h-[120px] text-lg py-4 border-2 border-primary/20 focus:border-primary transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="mt-6">
                                    <Button variant="ghost" onClick={closeCheckout}>{t('common.cancel')}</Button>
                                    <Button
                                        onClick={handleCalculateShipping}
                                        disabled={!shippingDetails.city || !shippingDetails.addressLine || calculateShipping.isPending}
                                        className="bg-primary text-white"
                                    >
                                        {calculateShipping.isPending ? t('checkout.calculating') : t('checkout.nextPayment')}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}

                        {/* Step 2: Payment */}
                        {step === 2 && (
                            <div className="space-y-6 mt-4">
                                {checkoutGroup === "physical" && (
                                    <div className="bg-muted p-4 rounded-lg border flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                            <span>{t('checkout.shippingTo')} <span className="font-semibold">{shippingDetails.city}</span></span>
                                        </div>
                                        <span className="font-bold">{shippingCost} {t('common.egp')}</span>
                                    </div>
                                )}

                                <div className={`text-center py-2 px-4 rounded-full text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2 mx-auto ${checkoutGroup === "physical" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"}`}>
                                    {checkoutGroup === "physical" ? <Package className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                                    {checkoutGroup === "physical" ? t('checkout.physicalOrder') : t('checkout.digitalOrder')}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">{t('checkout.selectMethod')}</Label>
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
                                        {t('checkout.paymentInstructions')}
                                    </h4>
                                    <p className="text-sm font-medium mb-1">{t('checkout.transferAmount', { amount: activeTotal })}</p>
                                    <p className="text-lg font-mono bg-background p-2 rounded border select-all text-center">
                                        {selectedMethodInfo.details}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">{t('checkout.exactAmount')}</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base font-semibold">{t('checkout.verifyPayment')}</Label>
                                    <div className="space-y-2">
                                        <Label className="text-sm">{t('checkout.transactionRef')}</Label>
                                        <Input placeholder={t('checkout.refPlaceholder')} value={reference} onChange={(e) => setReference(e.target.value)} />
                                    </div>
                                </div>

                                <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                                    {checkoutGroup === "physical" && (
                                        <Button variant="ghost" onClick={() => setStep(1)} className="sm:mr-auto">{t('common.back')}</Button>
                                    )}
                                    <Button variant="ghost" onClick={closeCheckout}>{t('common.cancel')}</Button>
                                    <Button
                                        onClick={handleCheckoutSubmit}
                                        disabled={checkout.isPending || !reference}
                                        className="bg-primary hover:bg-primary/90 min-w-[140px]"
                                    >
                                        {checkout.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('checkout.processing')}</> : t('checkout.confirmPayment')}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

function CartItemRow({ item, onUpdate, onRemove }: any) {
    const { t } = useTranslation();
    return (
        <div className="glass-card p-4 rounded-xl flex gap-4 items-center border border-white/5 hover:border-white/10 transition-all shadow-sm">
            <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-muted/30">
                <img
                    src={item.product?.coverUrl || item.collection?.coverUrl || ""}
                    alt={item.product?.title || item.collection?.title || ""}
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate mb-1">{item.product?.title || item.collection?.title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-semibold">
                        {item.product?.type ? t(`dashboard.products.types.${item.product.type}`) : (item.collection ? t('home.collections.badge') : t('cart.items'))}
                    </span>
                </div>
                <div className="mt-3 font-bold text-lg">
                    {item.product?.salePrice && item.product.salePrice < item.product.price ? (
                        <div className="flex items-center gap-2">
                            <span className="text-primary">{item.product.salePrice} <span className="text-xs font-normal">{t('common.egp')}</span></span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">{t('common.offer') || 'عرض'}</span>
                        </div>
                    ) : (
                        <span className="text-primary">
                            {item.product?.price || item.collection?.price} <span className="text-xs font-normal">{t('common.egp')}</span>
                        </span>
                    )}
                    {item.quantity && item.quantity > 1 && <span className="text-muted-foreground text-xs font-normal"> × {item.quantity}</span>}
                </div>
            </div>

            <div className="flex items-center bg-muted/20 rounded-xl p-0.5 border border-border/40">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/50 transition-all disabled:opacity-20"
                    onClick={() => onUpdate.mutate({ id: item.id, quantity: Math.max(1, (item.quantity || 1) - 1) })}
                    disabled={onUpdate.isPending || (item.quantity || 1) <= 1}>
                    -
                </Button>
                <span className="w-6 text-center font-bold text-sm tabular-nums">{item.quantity || 1}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background/50 transition-all"
                    onClick={() => onUpdate.mutate({ id: item.id, quantity: (item.quantity || 1) + 1 })}
                    disabled={onUpdate.isPending}>
                    +
                </Button>
            </div>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => onRemove.mutate(item.id)} disabled={onRemove.isPending}>
                <Trash2 className="w-5 h-5" />
            </Button>
        </div>
    );
}
