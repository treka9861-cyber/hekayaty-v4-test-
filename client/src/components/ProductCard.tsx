import { Link } from "wouter";
import { Star, ShoppingCart, LayoutGrid, Sparkles, Bookmark, Heart, User, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePrefetchHover, optimizeImage } from "@/lib/performance-core";
import { useUserById } from "@/hooks/use-users";

interface ProductCardProps {
  product?: Product;
  collection?: any;
  variant?: "default" | "compact";
}

export function ProductCard({ product, collection, variant = "default" }: ProductCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isCompact = variant === "compact";
  const item = product || (collection ? {
    id: collection.id,
    writerId: collection.writer_id,
    title: collection.title,
    description: collection.description,
    coverUrl: collection.cover_image_url,
    price: collection.price,
    isCollection: true,
    discount: collection.discount_percentage,
    storiesCount: collection.items?.length || 0,
    genre: t("home.collections.badge")
  } : null);

  const { data: writer } = useUserById(item?.writerId);

  if (!item) return null;

  const isCollection = (item as any).isCollection;
  const href = isCollection ? `/collection/${item.id}` : `/book/${item.id}`;

  const fetchProductDetails = async () => {
    if ((item as any).isCollection) return null;
    const { data, error } = await supabase
      .from('products')
      .select(`*, content_data:product_contents(content)`)
      .eq('id', item.id)
      .single();

    if (error) return null;
    return {
      ...data,
      content: data.content || (data as any).content_data?.[0]?.content,
    };
  };

  const prefetchProps = usePrefetchHover(["product", item.id], async () => {
    const data = await fetchProductDetails();
    if (item.coverUrl) {
      const img = new Image();
      img.src = item.coverUrl;
    }
    return data;
  });

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        {...prefetchProps}
        className="group relative flex gap-3 p-2 bg-[#02040A] rounded-xl transition-all hover:bg-[#030612] border border-white/5 hover:border-primary/20"
      >
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden relative">
          <motion.img
            src={optimizeImage(item.coverUrl, 200)}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-0"
            onLoad={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.classList.remove('opacity-0');
              img.classList.add('opacity-100');
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src !== item.coverUrl) {
                img.src = item.coverUrl;
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </div>
        <div className="flex flex-col flex-1 justify-center py-0.5 text-right" dir="rtl">
          <h3 className="text-sm font-serif font-bold text-white line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-[#aaaaaa] mb-1">
             <User size={10} />
             <span className="flex items-center gap-0.5">
               {writer?.displayName || t("common.author")}
               {writer?.isVerified && <BadgeCheck className="w-2.5 h-2.5 text-primary" />}
             </span>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <span className="font-black text-primary text-sm">
              {item.price > 0 ? `${item.price} ${t("common.egp")}` : t("dashboard.products.free")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      {...prefetchProps}
      className={cn(
        "group relative flex flex-col bg-[#02040A] rounded-[20px] overflow-hidden transition-all duration-700",
        "hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(255,184,0,0.1)] hover:border hover:border-[#FFB800]/20",
        "border border-white/5 gpu will-change-transform text-right max-w-[280px] h-full min-h-[400px] cursor-pointer"
      )}
      dir="rtl"
    >
      <Link href={href} className="flex flex-col h-full">
        {/* Book Cover Image Section - More Square Aspect */}
        <div className="relative w-full aspect-square overflow-hidden shrink-0">
          {/* Badges Overlay */}
          <div className="absolute top-3 inset-x-3 z-20 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-1.5 items-start">
              <span className="px-2 py-1 rounded-full bg-[#000000]/70 backdrop-blur-xl border border-white/10 text-[#FFB800] text-[8px] font-black uppercase tracking-widest">
                {item.genre || t("common.novel")}
              </span>
              {product?.isSerialized && (
                 <span className="px-2 py-1 rounded-full bg-red-600 text-white text-[8px] font-black">
                   {t("studio.market.ongoing")}
                 </span>
              )}
            </div>
            
            <div className="px-1.5 py-1 rounded-lg bg-[#000000]/50 backdrop-blur-xl text-[#FFB800] text-[10px] font-bold flex items-center gap-1 border border-white/5">
              <Star className="w-2.5 h-2.5 fill-[#FFB800] text-[#FFB800]" />
              <span>{product?.rating ? (product.rating / 10).toFixed(1) : "0.0"}</span>
            </div>
          </div>

          {/* Subtle Bottom Fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-transparent to-transparent z-10" />

          <motion.img
            src={optimizeImage(item.coverUrl, 600)}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 opacity-0"
            decoding="async"
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.classList.remove('opacity-0');
              img.classList.add('opacity-100');
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              // Fallback to original URL without optimization if it fails
              if (img.src !== item.coverUrl) {
                img.src = item.coverUrl;
              } else if (!img.src.includes('retry=')) {
                img.src = `${item.coverUrl}?retry=${Date.now()}`;
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Publisher Info Bar */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
           <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                 {writer?.avatarUrl ? (
                   <img src={writer.avatarUrl} className="w-full h-full object-cover" />
                 ) : (
                   <User size={10} className="text-[#aaaaaa]" />
                 )}
              </div>
              <span className="text-[#aaaaaa] text-[9px] font-black tracking-tight truncate max-w-[120px] flex items-center gap-1">
                 {writer?.displayName || (isCollection ? t("home.collections.bundle") : t("common.author"))}
                 {writer?.isVerified && <BadgeCheck className="w-2.5 h-2.5 text-primary shrink-0" />}
              </span>
           </div>
           {isCollection && (
              <span className="text-primary text-[8px] font-black uppercase tracking-tighter bg-primary/10 px-1.5 py-0.5 rounded-md">
                {(item as any).storiesCount}
              </span>
           )}
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col flex-1 space-y-2">
          <h3 className="text-[15px] font-serif font-black text-white leading-tight line-clamp-1 group-hover:text-[#FFB800] transition-colors min-h-[22px]">
            {item.title}
          </h3>

          <p className="text-[#aaaaaa] text-[11px] leading-relaxed line-clamp-2 opacity-50 min-h-[32px] font-medium">
            {item.description}
          </p>

          {/* Rating & Genre Row */}
          <div className="flex items-center justify-between pt-1">
             <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                   {[1, 2, 3, 4, 5].map((s) => (
                     <Star 
                       key={s} 
                       className={cn(
                         "w-2.5 h-2.5",
                         s <= (product?.rating ? product.rating / 10 : 0) 
                           ? "fill-[#FFB800] text-[#FFB800]" 
                           : "text-white/10"
                       )} 
                     />
                   ))}
                </div>
                <span className="text-[#aaaaaa] text-[9px] font-bold mr-0.5">({product?.reviewCount || 0})</span>
             </div>
             <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-white/30 font-black uppercase tracking-widest">
                {item.genre}
             </div>
          </div>

          {/* Centered Premium Price Row */}
          <div className="pt-3 mt-auto border-t border-white/5 flex flex-col items-center justify-center gap-0.5">
             <div className="flex items-center gap-2">
                {product?.salePrice && product.salePrice < product.price ? (
                  <>
                    <span className="text-[20px] font-black text-[#FFB800]">
                      {product.salePrice} {t("common.egp")}
                    </span>
                    <span className="text-[12px] text-[#aaaaaa] line-through opacity-30">
                      {product.price}
                    </span>
                  </>
                ) : (
                  <span className="text-[20px] font-black text-[#FFB800]">
                    {item.price > 0 ? (
                      `${item.price} ${t("common.egp")}`
                    ) : (
                      <span className="uppercase text-sm tracking-[0.1em] text-primary">{t("dashboard.products.free")}</span>
                    )}
                  </span>
                )}
             </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
