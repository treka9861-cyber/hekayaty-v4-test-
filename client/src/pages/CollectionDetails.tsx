import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useCollection } from "@/hooks/use-collections";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import {
    Loader2, Star, ShieldCheck, ShoppingCart,
    BookOpen, Info, LayoutGrid, CheckCircle2,
    ChevronRight, Sparkles, Layers, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function CollectionDetails() {
    const { t, i18n } = useTranslation();
    const [, params] = useRoute("/collection/:id");
    const id = params?.id || "";

    const { data: collection, isLoading } = useCollection(id);
    const { user } = useAuth();
    const addToCart = useAddToCart();

    // Check if user has active subscription access to the collection's creator
    const creatorId = (collection as any)?.writer_id;
    const { data: accessData } = useQuery({
        queryKey: ["collection-access", creatorId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/memberships/check-access?storeId=${creatorId}`);
            return res.json();
        },
        enabled: !!creatorId && !!user,
    });
    const hasMembershipAccess = accessData?.hasAccess === true;
    const planName = accessData?.planName ?? null;

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-secondary w-12 h-12" /></div>;
    if (!collection) return <div className="h-screen flex items-center justify-center bg-background text-muted-foreground">لم يتم العثور على المجموعة</div>;

    const totalIndividualPrice = collection.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.story?.price) || 0), 0) || 0;
    const currentPrice = parseFloat(collection.price) || 0;
    const discount = collection.discount_percentage || 0;

    return (
        <div className="min-h-screen pb-20 relative bg-[#050505] text-white">
            <SEO
                title={collection.title}
                description={collection.description}
                image={collection.cover_image_url}
                type="book"
            />
            <Navbar />

            {/* Background Atmosphere */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out pointer-events-none"
                style={{ backgroundImage: `url(${collection.cover_image_url})` }}
            >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#050505]" />
            </div>

            <div className="relative z-10 pt-32 px-4 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-16">
                    {/* Left: Cover & Actions */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="aspect-[2/3] rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 group relative"
                        >
                            <img src={collection.cover_image_url} alt={collection.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute top-6 left-6 px-4 py-2 bg-secondary text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                {t("home.collections.badge")}
                            </div>
                        </motion.div>

                        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-secondary/20 space-y-6 backdrop-blur-xl">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary/60">{t("studio.collections.bundlePrice")}</span>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-4xl font-black text-white">{currentPrice} <span className="text-secondary text-xl font-serif">EGP</span></span>
                                        {discount > 0 && <span className="text-lg text-muted-foreground line-through decoration-red-500/50">{totalIndividualPrice}</span>}
                                    </div>
                                </div>
                                {discount > 0 && (
                                    <div className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-lg shadow-lg shadow-red-500/20">
                                        -{discount}%
                                    </div>
                                )}
                            </div>

                            {/* Premium Subscription Access Badge */}
                            {hasMembershipAccess && planName && (
                                <div className="w-full relative group rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/20 p-4 mb-4 shadow-lg shadow-primary/5">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-primary/30" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-inner">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col text-start rtl:text-right">
                                            <span className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">
                                                {t("productDetails.unlockedVia", "متاح عبر العضوية")}
                                            </span>
                                            <span className="text-sm font-bold text-foreground leading-none">
                                                {planName}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {hasMembershipAccess ? (
                                <div className="space-y-2">
                                    <div className="w-full h-16 rounded-2xl bg-green-600/10 border border-green-500/30 flex items-center justify-center gap-3 text-green-400 font-black">
                                        <BadgeCheck className="w-5 h-5" />
                                        المجموعة متاحة عبر العضوية
                                    </div>
                                    <p className="text-[10px] text-center text-muted-foreground">اضغط على أي قصة أدناه لقراءتها فوراً</p>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => addToCart.mutate({
                                        collectionId: collection.id,
                                        quantity: 1,
                                        userId: user?.id || "1"
                                    })}
                                    disabled={addToCart.isPending}
                                    className="w-full h-16 rounded-2xl bg-secondary hover:bg-secondary/90 text-white text-lg font-black shadow-2xl shadow-secondary/20 group"
                                >
                                    <ShoppingCart className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                                    {addToCart.isPending ? "..." : t("home.collections.viewBundle")}
                                </Button>
                            )}

                            <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <ShieldCheck className="w-4 h-4 text-secondary" />
                                {t("studio.guide.save") || "تم تفعيل الحماية ضد السرقة"}
                            </div>
                        </div>
                    </div>

                    {/* Right: Info & Stories */}
                    <div className="flex flex-col">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 rounded-full bg-white/5 text-muted-foreground text-xs font-bold border border-white/10 uppercase tracking-widest">
                                    {collection.items?.length} {t("home.collections.storiesCount")}
                                </span>
                                <div className="h-px flex-grow bg-white/5" />
                                <div className="flex items-center gap-1 text-secondary font-black">
                                    <Sparkles className="w-4 h-4" />
                                    {t("home.collections.curated")}
                                </div>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-serif font-black leading-tight tracking-tight text-white">{collection.title}</h1>
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl whitespace-pre-line">{collection.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 pb-12 border-b border-white/5">
                                <div className="flex items-start gap-4 p-6 rounded-3xl bg-white/5 border border-white/5">
                                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-1 uppercase tracking-wider text-xs">{t("home.collections.premiumAccess")}</h4>
                                        <p className="text-xs text-muted-foreground">{t("home.collections.premiumDesc")}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-6 rounded-3xl bg-white/5 border border-white/5">
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-1 uppercase tracking-wider text-xs">{t("home.collections.instantUnlock")}</h4>
                                        <p className="text-xs text-muted-foreground">{t("home.collections.unlockDesc")}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-secondary/60 flex items-center gap-4">
                                    {t("home.collections.includedStories")}
                                    <div className="h-px flex-grow bg-secondary/10" />
                                </h3>

                                <div className="grid gap-4">
                                    {collection.items?.map((item: any, idx: number) => (
                                        <Link key={item.id} href={`/book/${item.story_id}`}>
                                            <motion.div
                                                whileHover={{ x: i18n.language === 'ar' ? -10 : 10 }}
                                                className="group p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center font-black text-secondary shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-xl">
                                                    <img src={item.story?.cover_url} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-bold text-lg group-hover:text-secondary transition-colors">{item.story?.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.story?.genre}</span>
                                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                                        <span className="text-[10px] font-bold text-secondary">{item.story?.price} EGP</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={cn("w-6 h-6 text-muted-foreground/30 group-hover:text-secondary transition-all", i18n.language === 'ar' && "rotate-180")} />
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
