import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Users, BookOpen, CheckCircle2, TrendingUp, Crown, Medal, Award, ArrowRight, ShoppingBag, Star, StarHalf } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { callEdgeFunction } from "@/hooks/use-edge-functions";
import { Navbar } from "@/components/Navbar";

interface LeaderboardEntry {
  rank: number;
  followersCount: number;
  booksCount: number;
  salesCount: number;
  avgRating: number;
  ratingsCount?: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
    role?: string;
  };
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return null;
}

function getRankStyle(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-600/10 border-yellow-500/30";
  if (rank === 2) return "bg-gradient-to-r from-gray-400/15 to-gray-500/5 border-gray-400/25";
  if (rank === 3) return "bg-gradient-to-r from-amber-700/15 to-amber-800/5 border-amber-600/25";
  return "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.04]";
}

function getRankNumberStyle(rank: number) {
  if (rank === 1) return "text-yellow-400 font-black text-xl";
  if (rank === 2) return "text-gray-300 font-black text-xl";
  if (rank === 3) return "text-amber-500 font-black text-xl";
  return "text-gray-500 font-bold text-lg";
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

type TabType = 'most_followed' | 'highest_rated' | 'most_books';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('most_followed');

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", activeTab],
    queryFn: async () => {
      const result = await callEdgeFunction(`leaderboard?category=${activeTab}`, undefined, "GET");
      return result as { data: LeaderboardEntry[]; meta: any };
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const entries = data?.data || [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <>
      <Helmet>
        <title>Top Accounts | Hekayaty Leaderboard</title>
        <meta name="description" content="Discover the most followed authors and creators on Hekayaty. See who's leading the storytelling community." />
      </Helmet>

      <div className="min-h-screen bg-[#080808] flex flex-col" dir="rtl">
        <Navbar />

        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0e0a1f] via-[#0a0a14] to-[#080808] border-b border-white/5">
          {/* Background Glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7c3aed]/10 rounded-full blur-[120px]" />
            <div className="absolute top-[10%] left-[20%] w-[300px] h-[200px] bg-[#c084fc]/8 rounded-full blur-[80px]" />
            <div className="absolute top-[10%] right-[20%] w-[300px] h-[200px] bg-[#818cf8]/8 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 py-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6 bg-[#7c3aed]/15 border border-[#7c3aed]/30 rounded-full px-4 py-1.5 backdrop-blur-sm">
              <TrendingUp className="w-3.5 h-3.5 text-[#c084fc]" />
              <span className="text-[#c084fc] text-xs font-bold tracking-wider uppercase">ترتيب عالمي</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
              أفضل الحسابات
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
              أكثر الكتّاب والمؤلفين تأثيراً على منصة حكايتي — مرتبون حسب عدد المتابعين والكتب
            </p>

            <div className="flex items-center justify-center gap-8 mt-10 text-center">
              <div>
                <div className="text-2xl font-black text-white">{data?.meta?.total ?? "—"}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">حساب مشارك</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-2xl font-black text-white">عالمي</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">نطاق التصنيف</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-2xl font-black text-white">مباشر</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">يتحدث الآن</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-2 mt-12 overflow-x-auto pb-2 custom-scrollbar">
              <button
                onClick={() => setActiveTab('most_followed')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'most_followed' 
                    ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                الأكثر متابعة
              </button>
              <button
                onClick={() => setActiveTab('highest_rated')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'highest_rated' 
                    ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Star className="w-4 h-4" />
                الأعلى تقييماً
              </button>
              <button
                onClick={() => setActiveTab('most_books')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'most_books' 
                    ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                الأكثر كتباً
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.03] rounded-2xl border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">حدث خطأ</h3>
              <p className="text-gray-600 text-sm">تعذر جلب الترتيب. يرجى المحاولة لاحقاً.</p>
            </div>
          )}

          {!isLoading && !error && (data as any)?.isHiddenGlobally && (
            <div className="text-center py-20">
              <Crown className="w-16 h-16 text-gray-700 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">الترتيب متوقف حالياً</h3>
              <p className="text-gray-600 text-sm">قامت الإدارة بإيقاف عرض الترتيب العالمي مؤقتاً.</p>
            </div>
          )}

          {!isLoading && !error && !(data as any)?.isHiddenGlobally && entries.length === 0 && (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">الترتيب قيد التحديث</h3>
              <p className="text-gray-600 text-sm">سيظهر ترتيب الحسابات هنا قريباً</p>
            </div>
          )}

          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">المتصدرون</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Rank 2 */}
                {top3[1] && (
                  <PodiumCard entry={top3[1]} order="sm:order-first sm:mt-8" activeTab={activeTab} />
                )}
                {/* Rank 1 */}
                {top3[0] && (
                  <PodiumCard entry={top3[0]} order="" isFeatured activeTab={activeTab} />
                )}
                {/* Rank 3 */}
                {top3[2] && (
                  <PodiumCard entry={top3[2]} order="sm:order-last sm:mt-16" activeTab={activeTab} />
                )}
              </div>
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">باقي الترتيب</h2>
              <div className="space-y-2">
                {rest.map((entry) => (
                  <LeaderboardRow key={entry.user.id} entry={entry} activeTab={activeTab} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PodiumCard({ entry, order, isFeatured = false, activeTab }: { entry: LeaderboardEntry; order: string; isFeatured?: boolean; activeTab: string }) {
  const username = entry.user.username || entry.user.id;

  return (
    <Link href={`/writer/${username}`}>
      <div className={`relative cursor-pointer transition-all duration-300 hover:-translate-y-1 ${order}`}>
        <div className={`rounded-2xl border p-5 text-center flex flex-col items-center gap-3 backdrop-blur-sm ${
          isFeatured
            ? "bg-gradient-to-b from-yellow-500/20 to-yellow-900/10 border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)]"
            : getRankStyle(entry.rank)
        }`}>
          {/* Rank Badge */}
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-3 py-1 rounded-full border text-xs font-black ${
            isFeatured ? "bg-yellow-500 text-black border-yellow-400" : entry.rank === 2 ? "bg-gray-400 text-black border-gray-300" : "bg-amber-700 text-white border-amber-600"
          }`}>
            {getRankIcon(entry.rank)}
            #{entry.rank}
          </div>

          {/* Avatar */}
          <div className={`relative mt-2 ${isFeatured ? "w-20 h-20" : "w-16 h-16"} rounded-full overflow-hidden border-2 ${isFeatured ? "border-yellow-400/60" : "border-white/10"}`}>
            <img
              src={entry.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.user.displayName)}&background=1c1c2e&color=fff&size=128`}
              alt={entry.user.displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Name */}
          <div>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <p className="font-bold text-white text-sm leading-tight line-clamp-1">{entry.user.displayName}</p>
              {entry.user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#cca660] shrink-0" />}
            </div>
            <p className="text-gray-500 text-xs">@{username}</p>
          </div>

          {/* Highlighted Stat for Active Tab */}
          <div className="mt-2 mb-2 p-2 rounded-xl bg-black/20 w-full flex flex-col items-center justify-center">
            {activeTab === 'most_followed' && (
              <>
                <div className="flex items-center gap-1 text-[#7c3aed] mb-1">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-white">{formatNumber(entry.followersCount)}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">متابع</div>
              </>
            )}
            {activeTab === 'most_books' && (
              <>
                <div className="flex items-center gap-1 text-[#cca660] mb-1">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="text-xl font-black text-white">{formatNumber(entry.booksCount)}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">كتاب</div>
              </>
            )}
            {activeTab === 'highest_rated' && (
              <>
                <div className="flex items-center gap-1 text-yellow-400 mb-1">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div className="text-xl font-black text-white">{(entry.avgRating ?? 0).toFixed(1)}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">تقييم ({entry.ratingsCount || 0} مراجعة)</div>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function LeaderboardRow({ entry, activeTab }: { entry: LeaderboardEntry; activeTab: string }) {
  const username = entry.user.username || entry.user.id;

  return (
    <Link href={`/writer/${username}`}>
      <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 cursor-pointer group ${getRankStyle(entry.rank)}`}>
        {/* Rank */}
        <div className={`w-10 text-center shrink-0 ${getRankNumberStyle(entry.rank)}`}>
          {entry.rank}
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
          <img
            src={entry.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.user.displayName)}&background=1c1c2e&color=fff&size=80`}
            alt={entry.user.displayName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Name & Username */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-white text-sm leading-tight truncate">{entry.user.displayName}</p>
            {entry.user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#cca660] shrink-0" />}
          </div>
          <p className="text-gray-500 text-xs truncate">@{username}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 text-sm text-gray-400">
          {activeTab === 'most_followed' && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#7c3aed]" />
              <span className="font-bold text-white text-lg">{formatNumber(entry.followersCount)}</span>
            </div>
          )}
          {activeTab === 'most_books' && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#cca660]" />
              <span className="font-bold text-white text-lg">{formatNumber(entry.booksCount)}</span>
            </div>
          )}
          {activeTab === 'highest_rated' && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="font-bold text-white text-lg">{(entry.avgRating ?? 0).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-[-2px] transition-all duration-200 shrink-0 mr-4" />
      </div>
    </Link>
  );
}
