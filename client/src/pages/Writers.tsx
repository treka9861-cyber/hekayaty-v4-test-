import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FeaturedWriter } from "@/components/FeaturedWriter";
import { Search, Users, BadgeCheck, Star, TrendingUp, UserCheck, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import writersBg from "@/assets/WhatsApp Image 2026-01-07 at 8.17.48 PM.jpeg";
import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/ui/skeleton-loader";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

type SortMode = "default" | "followers" | "rating" | "sales" | "verified";

const SORT_TABS: { id: SortMode; label: string; icon: any; color?: string }[] = [
    { id: "default",   label: "جميع الكتاب",    icon: Users },
    { id: "verified",  label: "موثق",        icon: BadgeCheck, color: "text-primary" },
    { id: "followers", label: "الأكثر متابعة",   icon: UserCheck,  color: "text-blue-400" },
    { id: "rating",    label: "الأعلى تقييماً",   icon: Star,       color: "text-amber-400" },
    { id: "sales",     label: "أفضل الكتاب",     icon: TrendingUp, color: "text-emerald-400" },
];

function useWritersFiltered(sort: SortMode) {
    const params = new URLSearchParams();
    if (sort === "verified") { params.set("verified", "true"); }
    else if (sort !== "default") { params.set("sort", sort); }

    return useQuery<any[]>({
        queryKey: ["writers-filtered", sort],
        queryFn: async () => {
            const res = await fetch(`/api/writers?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load writers");
            return res.json();
        },
        staleTime: 60_000,
    });
}

export default function Writers() {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState<SortMode>("default");

    const { data: writers, isLoading } = useWritersFiltered(sortMode);

    const filteredWriters = (writers || []).filter(writer =>
        (writer.displayName || writer.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        ((writer.bio || "").toLowerCase().includes(search.toLowerCase())) ||
        (writer.username || "").toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading && !writers) return <PageSkeleton />;

    return (
        <div className="min-h-screen relative overflow-hidden bg-black text-white font-sans">
            <SEO
                title={t('writers.title')}
                description={t('writers.subtitle')}
                type="website"
            />
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 opacity-40"
                style={{ backgroundImage: `url(${writersBg})` }}
            />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/60 via-black/90 to-black" />

            <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />

                <main className="flex-grow pt-24 sm:pt-40 pb-16 sm:pb-32">
                    <div className="container-responsive max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        {/* Header */}
                        <div className="mb-8 sm:mb-12 text-center">
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif font-black mb-4 sm:mb-8 text-white tracking-tight leading-tight">
                                {t('writers.title')}
                            </h1>
                            <p className="text-white/60 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                                {t('writers.subtitle')}
                            </p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                            {SORT_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSortMode(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all duration-300",
                                        sortMode === tab.id
                                            ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(204,166,96,0.3)]"
                                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <tab.icon className={cn("w-4 h-4", sortMode === tab.id ? "text-black" : (tab.color || "text-muted-foreground"))} />
                                    {tab.label}
                                    {tab.id === "verified" && sortMode !== "verified" && (
                                        <span className="ml-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 font-black">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search + Counter */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto w-full mb-16">
                            <div className="relative group w-full">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-30 transition-opacity duration-500" />
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('writers.searchPlaceholder')}
                                    className="w-full pl-16 pr-8 py-5 rounded-3xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all outline-none backdrop-blur-3xl text-lg font-medium shadow-2xl"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-xs font-bold whitespace-nowrap">
                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                                        <><span className="text-primary font-black">{filteredWriters.length}</span>
                                        <span className="uppercase tracking-widest opacity-80">{t("writers.title").split(' ')[0]}</span></>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Writers Grid */}
                        {filteredWriters.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 max-w-6xl mx-auto">
                                {filteredWriters.map(writer => (
                                    <FeaturedWriter key={writer.id} writer={{
                                        ...writer,
                                        displayName: writer.displayName || writer.display_name,
                                        avatarUrl: writer.avatarUrl || writer.avatar_url,
                                        isVerified: writer.isVerified || writer.is_verified,
                                    }} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32 bg-white/[0.02] rounded-[40px] backdrop-blur-2xl border border-white/5 max-w-4xl mx-auto">
                                <div className="inline-flex justify-center items-center w-24 h-24 rounded-full bg-white/5 mb-8 border border-white/10">
                                    <Users className="w-10 h-10 text-white/20" />
                                </div>
                                <h3 className="text-3xl font-black font-serif mb-4 text-white tracking-tight">{t('writers.notFound')}</h3>
                                <p className="text-white/40 text-lg">{t('writers.notFoundHint')}</p>
                            </div>
                        )}
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
