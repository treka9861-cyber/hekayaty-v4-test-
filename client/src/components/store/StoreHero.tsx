import { StoreProps } from "./types";
import { Button } from "@/components/ui/button";
import { optimizeImage, cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  Star,
  MessageSquare,
  Share2,
  Bell,
  MessageCircle,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function StoreHero({ user, settings, isOwnStore, themeColor, fontClass }: StoreProps) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isPublishingHouse = settings.isPublishingHouse || false;

  // Use real stats fetched dynamically from DB to ensure complete accuracy
  const { data: realStats } = useQuery({
    queryKey: ["store-real-stats", user.id],
    queryFn: async () => {
      // 1. Followers Count
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id);

      // 2. Books & Reviews (Published directly)
      const { data: products } = await supabase
        .from('products')
        .select('review_count, is_published')
        .eq('writer_id', user.id);

      // 3. Books & Reviews (Co-authored via claims)
      const { data: authoredBooks } = await supabase
        .from('book_authors')
        .select('book:book_id(review_count, is_published)')
        .eq('author_user_id', user.id);

      // Only count published books
      const publishedProducts = products?.filter(p => p.is_published !== false) || [];
      const publishedAuthoredBooks = authoredBooks?.map((ab: any) => ab.book).filter((b: any) => b && b.is_published !== false) || [];
      
      const books = publishedProducts.length + publishedAuthoredBooks.length;
      
      // Sum up all reviews across their published products and authored books
      const productReviews = publishedProducts.reduce((sum, p) => sum + (p.review_count || 0), 0);
      const authoredReviews = publishedAuthoredBooks.reduce((sum, b: any) => sum + (b.review_count || 0), 0);
      const reviews = productReviews + authoredReviews;

      return {
        followers: followers || 0,
        books,
        reviews
      };
    },
    enabled: !!user.id,
  });

  const followersCount = realStats?.followers ?? 0;
  const productsCount = realStats?.books ?? 0;
  const reviewCount = realStats?.reviews ?? 0;
  const { data: isFollowing } = useQuery({
    queryKey: ["follow-status", user.id, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !user.id) return false;
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("creator_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentUser?.id && !!user.id && !isOwnStore,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error("Not logged in");
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("creator_id", user.id);
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            creator_id: user.id
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", user.id, currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["store-real-stats", user.id] });
      toast({
        title: isFollowing ? "Unfollowed" : "Now Following!",
        description: isFollowing ? `You unfollowed ${user.displayName}.` : `You are now following ${user.displayName}.`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Please log in to follow this creator.", variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `${user.displayName}'s Store`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Store URL copied to clipboard." });
    }
  };

  const handleName = user.username ? `@${user.username}` : `@${(user.displayName || 'creator').replace(/\s+/g, '')}`;

  return (
    <div className="relative w-full mb-8">
      {/* Banner Image */}
      <div className="absolute inset-0 z-0 h-[450px]">
        <img
          src={user.bannerUrl ? optimizeImage(user.bannerUrl, 1600) : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'}
          alt="Banner"
          className="w-full h-full object-cover opacity-80"
          style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      </div>

      <div className="relative z-10 px-4 sm:px-8 pb-10 pt-56 flex flex-col xl:flex-row items-end justify-between gap-8">

        {/* Left Side: Profile & Actions */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-8 w-full xl:w-auto">
          {/* Avatar with Gold Tick */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 rounded-full border-4 border-[#1c1c22] overflow-hidden bg-card shadow-2xl relative z-10">
              <img
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}`}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Verified Badge */}
            {user.isVerified && (
              <div className="absolute bottom-1 right-2 z-20">
                <div className="bg-[#cca660] text-black w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(204,166,96,0.5)] border-2 border-[#1c1c22]">
                  <CheckCircle2 className="w-5 h-5 fill-black text-[#cca660]" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left pb-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#cca660] text-sm font-semibold flex items-center gap-1.5">
                <span className="w-4 h-4 inline-flex items-center justify-center bg-[#cca660]/20 rounded-full">
                  <Star className="w-2.5 h-2.5 fill-[#cca660]" />
                </span>
                {isPublishingHouse ? 'ناشر موثق' : 'مؤلف الأكثر مبيعاً'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <h1 className={`text-4xl sm:text-5xl font-bold text-white tracking-tight ${fontClass}`}>
                {user.displayName}
              </h1>
              {user.isVerified && <CheckCircle2 className="w-6 h-6 text-[#cca660] shrink-0" />}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-400 mb-4 font-medium">
              <span>{handleName}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {(settings as any).location || 'القاهرة، مصر'}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span>{isPublishingHouse ? 'دار نشر' : 'مؤلف عربي'}</span>
            </div>

            <p className="text-gray-300 max-w-2xl text-sm leading-relaxed mb-6 font-light">
              {user.bio || settings.welcomeMessage || 'مؤلف حائز على جوائز في روايات الخيال والإثارة. أصنع عوالم تبقى معك طويلاً بعد قراءة آخر صفحة.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 w-full justify-center sm:justify-start">
              <Button
                size="lg"
                className={cn(
                  "h-11 px-6 rounded-lg font-semibold text-black transition-all gap-2 group", 
                  isFollowing ? "bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-transparent" : "bg-[#dfba73] hover:bg-[#cca660] shadow-[0_4px_20px_rgba(204,166,96,0.3)]"
                )}
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                <Users className="w-4 h-4 fill-current" />
                {isFollowing ? (
                  <>
                    <span className="block group-hover:hidden">تتابع</span>
                    <span className="hidden group-hover:block">إلغاء المتابعة</span>
                  </>
                ) : (
                  "متابعة"
                )}
              </Button>


              
              <Button size="lg" variant="outline" className="h-11 px-6 rounded-lg bg-[#ffffff08] border-white/10 hover:bg-white/10 text-gray-200 gap-2">
                <MessageCircle className="w-4 h-4" /> رسالة
              </Button>

              <Button size="icon" variant="outline" className="h-11 w-11 rounded-lg bg-[#ffffff08] border-white/10 hover:bg-white/10 text-gray-200" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side: Stats */}
        <div className="flex items-center gap-6 xl:gap-8 bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-5 mb-2 w-full xl:w-auto justify-around xl:justify-start overflow-x-auto custom-scrollbar shadow-2xl">
          <StatBox icon={<Users />} value={formatNumber(followersCount)} label="المتابعون" />
          <div className="w-[1px] h-12 bg-white/5" />
          <StatBox icon={<BookOpen />} value={formatNumber(productsCount)} label="الكتب" />
          <div className="w-[1px] h-12 bg-white/5" />
          <StatBox icon={<Star />} value={formatNumber(reviewCount)} label="المراجعات" />
        </div>

      </div>
    </div>
  );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center shrink-0 min-w-[85px] group/stat cursor-default transition-all duration-300">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 text-[#cca660] mb-2 group-hover/stat:bg-[#cca660]/10 group-hover/stat:border-[#cca660]/30 transition-all duration-300">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 transition-transform duration-300 group-hover/stat:scale-110' })}
      </div>
      <div className="text-2xl font-black text-white tracking-tight group-hover/stat:text-[#cca660] transition-colors duration-300">{value}</div>
      <div className="text-[10px] font-bold text-gray-400 group-hover/stat:text-gray-300 uppercase tracking-widest mt-1 transition-colors duration-300">{label}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

import React from 'react';
