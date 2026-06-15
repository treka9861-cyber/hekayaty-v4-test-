import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useUser } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { useAuthoredBooks } from "@/hooks/use-book-claims";
import { useTrackStoreView } from "@/hooks/use-store-system";
import { StoreHero } from "@/components/store/StoreHero";
import { StoreHome } from "@/components/store/StoreHome";
import { StoreAbout } from "@/components/store/StoreAbout";
import { StoreProducts } from "@/components/store/StoreProducts";
import { StoreUniverses } from "@/components/store/StoreUniverses";
import { StoreCommunity } from "@/components/store/StoreCommunity";
import { StoreMemberships } from "@/components/store/StoreMemberships";
import { StoreAuthoredBooks } from "@/components/store/StoreAuthoredBooks";
import { ExtendedStoreSettings } from "@/components/store/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/SEO";
import { PageSkeleton } from "@/components/ui/skeleton-loader";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Settings, Palette, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WriterStore() {
  const [, params] = useRoute("/writer/:username");
  const username = params?.username || "";
  const [activeTab, setActiveTab] = useState("home");

  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { data: user, isLoading: userLoading } = useUser(username);
  const { data: productsData, isLoading: productsLoading } = useProducts({ writerId: user?.id });
  const { data: authoredBooksData, isLoading: authoredLoading } = useAuthoredBooks(user?.id ?? null);
  const trackView = useTrackStoreView();

  const isOwnStore = currentUser?.username === username;

  // Track profile view once user data is loaded
  useEffect(() => {
    if (user?.id && !isOwnStore) {
      trackView.mutate({ storeId: user.id, eventType: "profile_view" });
    }
  }, [user?.id, isOwnStore]);

  if (userLoading || productsLoading || authoredLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-4xl font-serif font-bold mb-4">{t("writerStore.notFoundTitle")}</h1>
        <p className="text-muted-foreground">{t("writerStore.notFoundSubtitle")}</p>
      </div>
    );
  }

  // Parse extended settings
  const settings = (user.storeSettings || {}) as ExtendedStoreSettings;
  const themeColor = settings.themeColor || "#9333ea"; // Default purple
  const font = settings.font || "serif";
  
  const getFontClass = (f: string) => {
    switch (f) {
      case "sans": return "font-sans";
      case "display": return "font-display";
      default: return "font-serif";
    }
  };
  const fontClass = getFontClass(font);

  // Normalize authored books
  const authoredBooks = (authoredBooksData || []).map((link: any) => {
    const book = link.book;
    if (!book) return null;
    return {
      ...book,
      writerId: book.writer_id,
      coverUrl: book.cover_url,
      reviewCount: book.review_count,
      isPublished: book.is_published,
      salePrice: book.sale_price,
      discountPercentage: book.discount_percentage,
      saleEndsAt: book.sale_ends_at,
      stockQuantity: book.stock_quantity,
      requiresShipping: book.requires_shipping,
      salesCount: book.sales_count,
      isSerialized: book.is_serialized,
      seriesStatus: book.series_status,
      lastChapterUpdatedAt: book.last_chapter_updated_at,
      merchandiseCategory: book.merchandise_category,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
    };
  }).filter(Boolean);

  // Combine publisher books and co-authored books
  const allBooksMap = new Map();
  [...(productsData || []), ...authoredBooks].forEach(b => {
    if (b && b.id) {
      allBooksMap.set(b.id, b);
    }
  });
  const allBooks = Array.from(allBooksMap.values());

  return (
    <div className="min-h-screen relative bg-[#0a0a0a] text-white">
      <SEO
        title={`متجر ${user.displayName} الرسمي`}
        description={user.bio || undefined}
        image={user.avatarUrl || user.bannerUrl || undefined}
      />
      <Navbar />

      {/* Global Background Layer */}
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]" />
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${themeColor}40 0%, transparent 70%)`
        }}
      />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-32">
        
        {/* Owner Dashboard Bar */}
        {isOwnStore && (
          <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5" style={{ color: themeColor }} />
              <span className="font-semibold text-white">{t("writerStore.storeOwnerView")}</span>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" /> {t("writerStore.storeSettings")}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="shadow-lg" style={{ backgroundColor: themeColor }}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> {t("writerStore.creatorDashboard")}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <StoreHero 
          user={user} 
          settings={settings} 
          isOwnStore={isOwnStore} 
          themeColor={themeColor} 
          fontClass={fontClass} 
        />

        {/* The Tabbed Navigation System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-white/10 p-0 rounded-none mb-10 overflow-x-auto custom-scrollbar flex-nowrap shrink-0 gap-6 sm:gap-10">
            <TabsTrigger value="home" className="rounded-none px-0 py-4 text-sm font-medium text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#cca660] transition-all">
              {t("writerStore.tabHome")}
            </TabsTrigger>
            <TabsTrigger value="books" className="rounded-none px-0 py-4 text-sm font-medium text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#cca660] transition-all">
              {t("writerStore.tabBooks")}
            </TabsTrigger>
            <TabsTrigger value="books_by" className="rounded-none px-0 py-4 text-sm font-medium text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#cca660] transition-all">
              مؤلفاتي
            </TabsTrigger>
            <TabsTrigger value="memberships" className="rounded-none px-0 py-4 text-sm font-medium text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#cca660] transition-all flex items-center gap-2">
              <Crown className="w-4 h-4" /> {t("writerStore.tabMemberships")}
            </TabsTrigger>
            <TabsTrigger value="about" className="rounded-none px-0 py-4 text-sm font-medium text-gray-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#cca660] transition-all">
              {t("writerStore.tabAbout")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreHome 
              user={user} 
              settings={settings} 
              isOwnStore={isOwnStore} 
              themeColor={themeColor} 
              fontClass={fontClass} 
              products={allBooks} 
              onTabChange={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="books" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreProducts 
              user={user} 
              settings={settings} 
              isOwnStore={isOwnStore} 
              themeColor={themeColor} 
              fontClass={fontClass} 
              products={allBooks} 
            />
          </TabsContent>

          <TabsContent value="books_by" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreAuthoredBooks
              user={user}
              settings={settings}
              isOwnStore={isOwnStore}
              themeColor={themeColor}
              fontClass={fontClass}
            />
          </TabsContent>

          <TabsContent value="memberships" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreMemberships 
              user={user} 
              themeColor={themeColor} 
            />
          </TabsContent>

          <TabsContent value="about" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <StoreAbout 
              user={user} 
              settings={settings} 
              isOwnStore={isOwnStore} 
              themeColor={themeColor} 
              fontClass={fontClass} 
            />
          </TabsContent>


        </Tabs>

      </div>
      <Footer />
    </div>
  );
}
