import { StoreProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { optimizeImage } from "@/lib/utils";
import { ChevronRight, PlayCircle, Star, MessageSquare, Bookmark, Crown, Clock, Gift } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCommunityPosts } from "@/hooks/use-store-system";
import { apiRequest } from "@/lib/queryClient";
import { useMediaVideos } from "@/hooks/use-media";
import { StoreMemberships } from "./StoreMemberships";
import { useTranslation } from "react-i18next";

interface StoreHomeProps extends StoreProps {
  products: any[];
}

export function StoreHome({ user, settings, themeColor, fontClass, products, onTabChange }: StoreHomeProps) {
  const { t } = useTranslation();
  // Fetch a preview of universes
  const { data: universes } = useQuery({
    queryKey: ["universes", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universes')
        .select('*')
        .eq('creator_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!user.id,
  });

  const featuredUniverse = universes?.[0];
  const featuredProducts = products?.slice(0, 5) || [];
  
  // Fetch real community highlights
  const { data: posts } = useCommunityPosts(user.id);
  const communityHighlights = posts?.slice(0, 2) || [];

  // Fetch real media videos
  const { data: mediaVideos } = useMediaVideos({ creatorId: user.id });
  const featuredVideo = mediaVideos?.find(v => v.isFeatured) || mediaVideos?.[0];
  const sideVideos = mediaVideos?.filter(v => v.id !== featuredVideo?.id).slice(0, 3) || [];

  // Fetch real membership tiers from the new plans API
  const { data: plans } = useQuery({
    queryKey: ["membership-plans", user.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/memberships/plans?storeId=${user.id}`);
      return res.json();
    },
    enabled: !!user.id,
  });

  const activePlans = plans?.filter((p: any) => p.status === "active") || [];
  
  let lowestPriceInCents = Infinity;
  activePlans.forEach((plan: any) => {
    plan.pricing?.forEach((price: any) => {
      if (price.price_in_cents < lowestPriceInCents) {
        lowestPriceInCents = price.price_in_cents;
      }
    });
  });

  const lowestPrice = lowestPriceInCents === Infinity ? null : lowestPriceInCents / 100;

  const membershipText = lowestPrice !== null
    ? t("writerStore.membershipFrom", { price: lowestPrice })
    : t("writerStore.supportCreatorDirectly");

  // Achievements from settings or defaults
  const achievements: any[] = (settings.achievements || [
    { id: '1', title: 'Bestseller', icon: '🌟', color: '#cca660' },
    { id: '2', title: 'Elite Author', icon: '💎', color: '#a0a0a0' },
    { id: '3', title: 'Top Fantasy', icon: '👑', color: '#cca660' },
    { id: '4', title: 'Verified', icon: '✅', color: '#60a5fa' },
    { id: '5', title: 'Community', icon: '🤝', color: '#cd7f32' },
  ]).map((ach: any) => ({
    ...ach,
    color: ach.color || '#cca660'
  }));

  const bioSnippet = user.bio 
    ? (user.bio.length > 150 ? user.bio.substring(0, 150) + "..." : user.bio) 
    : 'Award-winning author known for unique blends of science fiction, fantasy, and psychological thrillers.';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Left Column (Main Content) - 8/12 width on large screens */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
        
        {/* Featured Books Section */}
        <ProductRow 
          title={t("writerStore.featuredBooks")} 
          products={featuredProducts} 
          viewAllLink="books" 
          onTabChange={onTabChange}
        />

        {/* Ebooks Section */}
        <ProductRow 
          title={t("writerStore.digitalEditions")} 
          products={products?.filter(p => p.type !== 'physical' && p.type !== 'merchandise') || []} 
          viewAllLink="books" 
          onTabChange={onTabChange}
        />

        {/* Physical Books & Merch Section */}
        <ProductRow 
          title={t("writerStore.physicalCopies")} 
          products={products?.filter(p => p.type === 'physical' || p.type === 'merchandise') || []} 
          viewAllLink="books" 
          onTabChange={onTabChange}
        />



        {/* Membership Section or Banner */}
        {activePlans.length > 0 ? (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-6 px-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Crown className="w-6 h-6 text-[#cca660]" />
                {t("writerStore.membershipPlans")}
              </h2>
            </div>
            <StoreMemberships user={user} themeColor={themeColor} hideHeader />
          </div>
        ) : (
          <section className="bg-gradient-to-r from-[#1a1a20] to-[#111115] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
             <div className="flex flex-wrap items-center gap-6 sm:gap-12 flex-1">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 rounded-xl bg-[#cca660]/10 text-[#cca660]"><Crown className="w-6 h-6" /></div>
                 <div>
                   <h4 className="font-bold text-white text-sm">{t("writerStore.joinPremium")}</h4>
                   <p className="text-xs text-gray-400">{membershipText}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="p-2.5 rounded-xl bg-white/5 text-gray-300"><Clock className="w-6 h-6" /></div>
                 <div>
                   <h4 className="font-bold text-white text-sm">{t("writerStore.earlyAccess")}</h4>
                   <p className="text-xs text-gray-400">{t("writerStore.earlyAccessDesc")}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 hidden md:flex">
                 <div className="p-2.5 rounded-xl bg-white/5 text-gray-300"><Gift className="w-6 h-6" /></div>
                 <div>
                   <h4 className="font-bold text-white text-sm">{t("writerStore.exclusiveContent")}</h4>
                   <p className="text-xs text-gray-400">{t("writerStore.exclusiveContentDesc")}</p>
                 </div>
               </div>
             </div>
             
             <Button onClick={() => onTabChange?.("memberships")} className="shrink-0 bg-[#dfba73] hover:bg-[#cca660] text-black font-bold h-12 px-8 w-full sm:w-auto">
               {t("writerStore.becomeMember")}
             </Button>
          </section>
        )}

      </div>

      {/* Right Column (Sidebar) - 4/12 width on large screens */}
      <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
        
        {/* About the Author */}
        <div className="bg-[#111115] border border-white/5 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-3 text-lg">{t("writerStore.aboutAuthor")}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            {bioSnippet}
          </p>
          <span onClick={() => onTabChange?.("about")} className="text-[#cca660] text-sm hover:underline cursor-pointer">{t("writerStore.readMore")}</span>
        </div>




      </div>
    </div>
  );
}

// Inline Heart icon since it wasn't imported at the top
function Heart(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  );
}

function formatTimeAgo(dateString?: string | Date) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  
  return date.toLocaleDateString();
}

// Reusable Product Row Component for the Home Dashboard
function ProductRow({ title, products, viewAllLink, onTabChange }: { title: string, products: any[], viewAllLink: string, onTabChange?: (tab: string) => void }) {
  if (!products || products.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        <span 
          onClick={() => onTabChange?.(viewAllLink)} 
          className="text-sm text-[#cca660] cursor-pointer hover:underline flex items-center"
        >
          عرض الكل <ChevronRight className="w-4 h-4" />
        </span>
      </div>
      
      <div className="flex gap-4 sm:gap-5 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {products.map(product => (
          <div key={product.id} className="w-[140px] sm:w-[170px] shrink-0">
            <div className="group relative rounded-xl overflow-hidden bg-[#1c1c22] border border-white/5 h-full flex flex-col transition-all hover:border-white/20 hover:-translate-y-1">
              <div className="aspect-[2/3] w-full overflow-hidden bg-black/20">
                <img 
                  src={optimizeImage(product.coverUrl || product.imageUrl, 400)} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-1 mb-1">{product.title}</h3>
                
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-300 mb-2">
                  <Star className="w-3 h-3 fill-[#cca660] text-[#cca660]" />
                  <span className="font-semibold text-white">{product.rating ? (product.rating / 10).toFixed(1) : "0.0"}</span>
                </div>
                
                <div className="mt-auto flex justify-between items-center text-xs">
                  <span className="text-gray-400 text-[9px] sm:text-[10px] tracking-wider uppercase">
                    {product.type}
                  </span>
                  <span className="font-bold text-[#cca660]">
                    {product.price === 0 ? 'مجانًا' : `${product.price} ج.م`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
