import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callEdgeFunction } from "@/hooks/use-edge-functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, RefreshCw, Eye, EyeOff, CheckCircle2, Users, BookOpen, Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
}

export function LeaderboardAdmin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current leaderboard (all including hidden)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-leaderboard"],
    queryFn: async () => {
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from("account_leaderboard_cache")
        .select("*")
        .order("rank", { ascending: true })
        .limit(200);

      if (leaderboardError) throw leaderboardError;
      if (!leaderboardData || leaderboardData.length === 0) return [];

      const userIds = leaderboardData.map((item: any) => item.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url, is_verified, role")
        .in("id", userIds);

      if (usersError) console.error("Failed to fetch users for admin leaderboard:", usersError);

      const userMap: Record<string, any> = {};
      usersData?.forEach((user: any) => {
        userMap[user.id] = user;
      });

      return leaderboardData.map((item: any) => ({
        id: item.id,
        rank: item.rank,
        followers_count: item.followers_count,
        books_count: item.books_count,
        is_hidden: item.is_hidden,
        calculated_at: item.calculated_at,
        user: userMap[item.user_id] || {
          id: item.user_id,
          username: "unknown",
          display_name: "Unknown User",
        }
      }));
    },
  });

  const lastUpdated = data?.[0]?.calculated_at;

  // Force refresh ranking
  const handleForceRefresh = async () => {
    if (!confirm("سيتم إعادة احتساب جميع التصنيفات. قد يستغرق هذا بضع ثوانٍ. هل تريد المتابعة؟")) return;
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      await callEdgeFunction("update-leaderboard", {}, "POST");
      await queryClient.invalidateQueries({ queryKey: ["admin-leaderboard"] });
      toast({ title: "✅ تم التحديث", description: "تم إعادة احتساب التصنيفات بنجاح." });
    } catch (e: any) {
      toast({ title: "❌ فشل التحديث", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle hidden status for a user
  const toggleHide = useMutation({
    mutationFn: async ({ id, isHidden }: { id: number; isHidden: boolean }) => {
      const { error } = await supabase
        .from("account_leaderboard_cache")
        .update({ is_hidden: !isHidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leaderboard"] });
      toast({ title: "تم التحديث", description: "تم تغيير حالة ظهور الحساب في الترتيب." });
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 mt-6">
      <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl overflow-hidden">
        <CardHeader className="bg-white/5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#7c3aed]/20 rounded-lg">
                <Trophy className="w-6 h-6 text-[#c084fc]" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gradient">إدارة ترتيب أفضل الحسابات</CardTitle>
                <CardDescription>
                  عرض التصنيف الحالي وإخفاء الحسابات أو تحديث الترتيب.
                  {lastUpdated && (
                    <span className="mr-2 text-[10px] text-gray-500">
                      آخر تحديث: {new Date(lastUpdated).toLocaleString("ar-EG")}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2 border-[#7c3aed]/40 bg-[#7c3aed]/10 text-[#c084fc] hover:bg-[#7c3aed]/20"
                onClick={handleForceRefresh}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {refreshing ? "جاري التحديث..." : "تحديث الترتيب الآن"}
              </Button>
              <a href="/leaderboards/accounts" target="_blank">
                <Button variant="ghost" size="sm" className="gap-2 text-gray-400 hover:text-white">
                  <ExternalLink className="w-4 h-4" />
                  عرض العام
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-400 mb-2">لا يوجد ترتيب حالياً</h3>
              <p className="text-gray-600 text-sm mb-6">انقر على "تحديث الترتيب الآن" لحساب التصنيف لأول مرة.</p>
              <Button onClick={handleForceRefresh} disabled={refreshing} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                احسب الترتيب الآن
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 w-16">الرتبة</TableHead>
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحساب</TableHead>
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">المتابعون</TableHead>
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الكتب</TableHead>
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">الحالة</TableHead>
                  <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4 text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((entry: any) => (
                  <TableRow
                    key={entry.id}
                    className={`border-white/5 hover:bg-white/5 transition-colors ${entry.is_hidden ? "opacity-40" : ""}`}
                  >
                    <TableCell className="py-4">
                      <span className={`font-black text-lg ${entry.rank <= 3 ? "text-[#c084fc]" : "text-gray-400"}`}>
                        #{entry.rank}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0">
                          <img
                            src={entry.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.user?.display_name || "U")}&background=1c1c2e&color=fff&size=80`}
                            alt={entry.user?.display_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{entry.user?.display_name}</span>
                            {entry.user?.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#cca660]" />}
                          </div>
                          <span className="text-xs text-gray-500">@{entry.user?.username}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#7c3aed]" />
                        <span className="font-bold text-white">{formatNumber(entry.followers_count)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#7c3aed]" />
                        <span className="font-bold text-white">{formatNumber(entry.books_count)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {entry.is_hidden ? (
                        <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">مخفي</Badge>
                      ) : (
                        <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">ظاهر</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/writer/${entry.user?.username}`} target="_blank">
                          <Button size="sm" variant="ghost" className="h-8 px-3 text-gray-400 hover:text-white gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 px-3 gap-1.5 ${entry.is_hidden ? "text-green-400 hover:text-green-300 hover:bg-green-500/10" : "text-red-400 hover:text-red-300 hover:bg-red-500/10"}`}
                          onClick={() => toggleHide.mutate({ id: entry.id, isHidden: entry.is_hidden })}
                          disabled={toggleHide.isPending}
                        >
                          {entry.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {entry.is_hidden ? "إظهار" : "إخفاء"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
