import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { useTranslation } from "react-i18next";
import { optimizeImage, usePrefetchHover } from "@/lib/performance-core";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface FeaturedWriterProps {
  writer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio?: string | null;
    productCount?: number;
    isVerified?: boolean;
    [key: string]: any;
  };
  showStats?: boolean;
}

export function FeaturedWriter({ writer, showStats = true }: FeaturedWriterProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const fetchWriter = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', writer.username)
      .single();

    if (error) return null;
    return {
      ...data,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      bannerUrl: data.banner_url,
      storeSettings: data.store_settings,
      stripeAccountId: data.stripe_account_id,
      subscriptionTier: data.subscription_tier || 'free',
      commissionRate: data.commission_rate || 20,
      isActive: data.is_active ?? true,
      shippingPolicy: data.shipping_policy || "",
    };
  };

  const prefetchProps = usePrefetchHover(["user", writer.username], fetchWriter);

  return (
    <Link href={`/writer/${writer.username}`}>
      <motion.div
        whileHover={{ y: -15, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...prefetchProps}
        className="group relative aspect-square overflow-hidden rounded-[32px] bg-[#02040A] border border-white/5 hover:border-primary/40 transition-all duration-700 cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]"
      >
        {/* Background Image / Banner with High Visibility */}
        <div className="absolute inset-0 z-0">
          <motion.img 
            src={writer.bannerUrl || "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop"} 
            className="w-full h-full object-cover opacity-0 group-hover:scale-110 transition-transform duration-1000"
            alt="background"
            onLoad={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.classList.remove('opacity-0');
              img.classList.add('opacity-60', 'group-hover:opacity-80');
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.src !== "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop") {
                img.src = "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop";
              }
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02040A] via-[#02040A]/60 to-black/20" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full p-8 flex flex-col items-center justify-center text-center">
          
          {/* Avatar with Elite Glass-Pill Frame */}
          <div className="relative mb-6">
            <div className="absolute inset-[-15px] bg-primary/10 blur-[30px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/10 group-hover:border-primary/50 p-1.5 bg-black/40 backdrop-blur-2xl transition-all duration-700 overflow-hidden shadow-2xl">
              <motion.img
                src={optimizeImage(writer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(writer.displayName)}&background=random`, 300)}
                alt={writer.displayName}
                className="w-full h-full rounded-full object-cover transform transition-transform duration-1000 group-hover:scale-110 opacity-0"
                onLoad={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.classList.remove('opacity-0');
                  img.classList.add('opacity-100');
                }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(writer.displayName)}&background=random`;
                  if (img.src !== fallbackSrc && writer.avatarUrl) {
                    // If it's a supabase URL and we optimized it, try the raw url first
                    if (img.src !== writer.avatarUrl) {
                       img.src = writer.avatarUrl;
                    } else {
                       img.src = fallbackSrc;
                    }
                  }
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            </div>
          </div>

          {/* Identity Section */}
          <div className="space-y-1.5 mb-6">
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-xl md:text-2xl font-serif font-black text-white tracking-tight leading-tight group-hover:text-primary transition-colors duration-500 line-clamp-2 px-2">
                {writer.displayName}
              </h3>
              {writer.isVerified && (
                <div className="relative shrink-0" title="كاتب موثق">
                  <div className="absolute inset-0 bg-primary/40 blur-md rounded-full" />
                  <BadgeCheck className="relative w-5 h-5 text-primary drop-shadow-[0_0_6px_rgba(204,166,96,0.8)]" />
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/5 border border-primary/10">
              <p className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                @{writer.username}
              </p>
            </div>
            {writer.isVerified && (
              <div className="flex justify-center">
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/60 border border-primary/20 px-2 py-0.5 rounded-full bg-primary/5">
                  ✓ كاتب موثق
                </span>
              </div>
            )}
          </div>

          {/* Performance Badge - Clean & Integrated */}
          {showStats && (
            <div className="mt-auto">
               <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,184,0,0.8)]" />
                  <div className="flex items-center gap-1.5">
                     <span className="text-lg font-black text-white group-hover:text-primary transition-colors leading-none">
                       {writer.productCount || 0}
                     </span>
                     <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em] group-hover:text-primary/60 transition-colors">
                       {t("writerStore.products")}
                     </span>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Premium Finishing Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-1000" />
      </motion.div>
    </Link>
  );
}
