import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useProducts } from "@/hooks/use-products";
import { useCollections } from "@/hooks/use-collections";
import { ProductCard } from "@/components/ProductCard";
import { Search, Book, Palette, Layers, LayoutGrid, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import marketplaceBg from "@/assets/d2c8245c-c591-4cc9-84d2-27252be8dffb.png";
import { cn } from "@/lib/utils";
import { useSort } from "@/hooks/use-sort";
import { SortSelector } from "@/components/SortSelector";
import { PageSkeleton } from "@/components/ui/skeleton-loader";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";

type MarketplaceType = "ebook" | "asset" | "collection" | "merchandise";

export default function Marketplace() {
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);
  const [type, setType] = useState<MarketplaceType>("ebook");
  const [isSerialized, setIsSerialized] = useState<boolean | undefined>(
    new URLSearchParams(window.location.search).get('isSerialized') === 'true'
  );

  // Sync state with URL location
  useEffect(() => {
    if (location === "/assets") setType("asset");
    else if (location === "/merchandise") setType("merchandise");
    else if (location === "/marketplace") {
      const params = new URLSearchParams(window.location.search);
      if (params.get('type') === 'collection') setType("collection");
      else setType("ebook");
    }

    const params = new URLSearchParams(window.location.search);
    setIsSerialized(params.get('isSerialized') === 'true');
  }, [location, window.location.search]);

  const handleTypeChange = (newType: MarketplaceType | "serialized") => {
    if (newType === "serialized") {
      setIsSerialized(true);
      setType("ebook");
      setLocation("/marketplace?isSerialized=true");
    } else {
      setIsSerialized(false);
      setType(newType);
      if (newType === "asset") setLocation("/assets");
      else if (newType === "merchandise") setLocation("/merchandise");
      else if (newType === "collection") setLocation("/marketplace?type=collection");
      else setLocation("/marketplace");
    }
  };

  const { data: productData, isLoading: productsLoading } = useProducts({
    search: debouncedSearch,
    type: type === 'collection' ? 'ebook' : type,
    isSerialized,
    isPublished: true
  });
  const { data: collectionData, isLoading: collectionsLoading } = useCollections({ isPublished: true });

  const products = productData || [];
  const collections = collectionData || [];

  const isLoading = productsLoading || (type === 'collection' && collectionsLoading);

  const initialDisplayItems = useMemo(() => 
    type === 'collection'
      ? collections.filter(c => !debouncedSearch || c.title.toLowerCase().includes(debouncedSearch.toLowerCase()))
      : products,
    [type, collections, products, debouncedSearch]
  );

  const { sortBy, setSortBy, sortedItems: displayItems } = useSort<any>(initialDisplayItems);

  const getPageTitle = () => {
    if (isSerialized) return t("marketplace.tabs.serialized");
    switch (type) {
      case "asset": return t("marketplace.assetsTitle");
      case "merchandise": return t("marketplace.merchandiseTitle");
      case "collection": return t("home.collections.title");
      default: return t("marketplace.title");
    }
  };

  const getPageSubtitle = () => {
    if (isSerialized) return t("marketplace.tabs.serializedSubtitle") || t("marketplace.subtitle");
    switch (type) {
      case "asset": return t("marketplace.assetsSubtitle");
      case "merchandise": return t("marketplace.merchandiseSubtitle");
      case "collection": return t("home.collections.subtitle");
      default: return t("marketplace.subtitle");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black selection:bg-primary/30">
      <SEO 
        title={getPageTitle()} 
        description={getPageSubtitle()} 
      />
      {/* Immersive Background Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 scale-105"
        style={{ 
          backgroundImage: `url(${marketplaceBg})`,
          filter: 'brightness(0.4) saturate(1.2)' 
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black/40 to-black backdrop-blur-[2px]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-24 sm:pt-40 pb-16 sm:pb-32">
          <div className="container-responsive max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Premium Hero Header */}
            <div className="mb-10 sm:mb-24 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif font-black mb-4 sm:mb-8 text-white tracking-tight leading-[1.1]">
                  {getPageTitle()}
                </h1>
                <p className="text-white/60 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                  {getPageSubtitle()}
                </p>
              </motion.div>
            </div>

            {/* Control Bar (Tabs, Search, Sort) */}
            <div className="sticky top-16 sm:top-24 z-40 mb-8 sm:mb-16 space-y-4 sm:space-y-8">
              
              {/* Filter Tabs Container */}
              <div className="max-w-5xl mx-auto">
                <div className="p-1 sm:p-1.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl flex overflow-x-auto gap-1 sm:gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] scrollbar-hide">
                  {[
                    { id: "ebook", label: t("marketplace.tabs.stories"), icon: Book },
                    { id: "serialized", label: t("marketplace.tabs.serialized"), icon: Layers },
                    { id: "asset", label: t("marketplace.tabs.assets"), icon: Palette },
                    { id: "merchandise", label: t("marketplace.tabs.merchandise"), icon: ShoppingBag },
                    { id: "collection", label: t("marketplace.tabs.collections"), icon: LayoutGrid },
                  ].map((tab) => {
                    const isActive = tab.id === "serialized" ? isSerialized : (type === tab.id && !isSerialized);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTypeChange(tab.id as any)}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-3 px-3 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all duration-500 flex-shrink-0 justify-center group whitespace-nowrap",
                          isActive
                            ? (tab.id === "serialized" ? "bg-amber-500 text-white shadow-xl shadow-amber-500/30 scale-[1.05]" : "bg-primary text-white shadow-xl shadow-primary/30 scale-[1.05]")
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <tab.icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-500 group-hover:scale-125", isActive ? "scale-110" : "")} />
                        <span className="tracking-wide">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search and Sort Area */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6 max-w-5xl mx-auto w-full">
                <div className="relative group w-full">
                  <div className="absolute inset-y-0 right-4 sm:right-6 flex items-center pointer-events-none z-10">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white/20 group-focus-within:text-primary transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder={
                      type === "asset"
                        ? t("marketplace.assetsSearchPlaceholder")
                        : type === "merchandise"
                          ? t("marketplace.merchandiseSearchPlaceholder")
                          : t("marketplace.searchPlaceholder", "ابحث بالعنوان، الناشر، أو الكلمات المفتاحية...")
                    }
                    className="w-full pr-10 sm:pr-16 pl-24 sm:pl-32 py-3.5 sm:py-6 rounded-2xl sm:rounded-[2rem] bg-white/[0.03] backdrop-blur-3xl border border-white/10 text-white focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all duration-500 outline-none placeholder:text-white/20 text-sm sm:text-lg shadow-[0_10px_40px_rgba(0,0,0,0.3)] group-hover:bg-white/[0.05]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="absolute inset-y-1.5 left-1.5 flex items-center">
                    <button className="h-full px-4 sm:px-8 rounded-xl sm:rounded-[1.5rem] bg-primary text-black font-black text-xs sm:text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20">
                      {t("common.search") || "بحث"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto shrink-0">
                   <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-xs font-bold whitespace-nowrap">
                      <span className="text-primary font-black">{displayItems.length}</span>
                      <span>{t("marketplace.results") || "النتائج"}</span>
                   </div>
                   <SortSelector
                    value={sortBy}
                    onValueChange={setSortBy}
                    className="flex-1 sm:flex-none min-w-0 sm:min-w-[180px]"
                  />
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-10"
                >
                  {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-2xl sm:rounded-[2rem] bg-white/5 border border-white/10 animate-pulse" />
                  ))}
                </motion.div>
              ) : displayItems.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-10"
                >
                  {displayItems.map((item: any) => (
                    <div key={item.id} className="gpu will-change-transform">
                      <ProductCard
                        product={type === 'collection' ? undefined : item}
                        collection={type === 'collection' ? item : undefined}
                      />
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-40 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 max-w-2xl mx-auto shadow-2xl"
                >
                  <div className="inline-flex justify-center items-center w-32 h-32 rounded-full bg-primary/5 border border-primary/10 mb-10 shadow-inner">
                    {type === "asset" ? <Layers className="w-16 h-16 text-primary/20" /> : type === "merchandise" ? <ShoppingBag className="w-16 h-16 text-primary/20" /> : <Book className="w-16 h-16 text-primary/20" />}
                  </div>
                  <h3 className="text-3xl font-black font-serif mb-4 text-white">
                    {type === "asset" ? t("marketplace.noAssets") : type === "merchandise" ? t("marketplace.noMerchandise") : t("marketplace.noStories")}
                  </h3>
                  <p className="text-white/30 text-lg max-w-sm mx-auto font-medium">
                    {t("marketplace.tryAdjusting")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
