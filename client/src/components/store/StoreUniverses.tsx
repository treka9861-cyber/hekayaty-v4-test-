import { StoreProps } from "./types";
import { Button } from "@/components/ui/button";
import { Map, Book, Users, Scroll, Plus, Globe, Lock } from "lucide-react";
import { useUniverses } from "@/hooks/use-store-system";
import { Skeleton } from "@/components/ui/skeleton";

export function StoreUniverses({ user, themeColor, fontClass, isOwnStore }: StoreProps) {
  const { data: universes, isLoading } = useUniverses(user.id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-[400px] rounded-3xl bg-white/5" />
        ))}
      </div>
    );
  }

  const hasUniverses = universes && universes.length > 0;

  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className={`text-4xl font-bold mb-4 ${fontClass}`}>استكشف العوالم</h2>
        <p className="text-gray-400 text-lg">
          تعمق في التاريخ والجداول الزمنية والشخصيات في هذه العوالم المترابطة.
        </p>
      </div>

      {!hasUniverses && (
        <div className="py-24 text-center glass-card rounded-3xl border border-dashed border-white/10">
          <Globe className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className={`text-2xl font-bold text-white mb-2 ${fontClass}`}>لا توجد عوالم بعد</h3>
          <p className="text-gray-400 mb-6">
            {isOwnStore
              ? "أنشئ عالمك الخيالي الأول لربط قصصك وشخصياتك وتاريخك."
              : "لم يقم هذا المبدع ببناء عالم بعد. عد لاحقًا!"}
          </p>
          {isOwnStore && (
            <Button style={{ backgroundColor: themeColor }}>
              <Plus className="w-4 h-4 mr-2" /> أنشئ عالمك الأول
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {universes?.map((universe: any) => (
          <div key={universe.id} className="group relative rounded-3xl overflow-hidden glass-card border border-white/10 shadow-2xl">
            {/* Background */}
            <div className="absolute inset-0 z-0">
              {universe.cover_url ? (
                <img
                  src={universe.cover_url}
                  alt={universe.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 group-hover:opacity-60"
                />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${themeColor}40, #0a0a0a)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col h-full min-h-[400px] justify-end">
              <div className="flex items-center gap-2 mb-3">
                {universe.is_public ? (
                  <Globe className="w-4 h-4 text-gray-400" />
                ) : (
                  <Lock className="w-4 h-4" style={{ color: themeColor }} />
                )}
                <span className="text-xs uppercase tracking-widest text-gray-400">
                  {universe.is_public ? "عالم عام" : "للأعضاء فقط"}
                </span>
              </div>
              <h3 className={`text-3xl font-bold text-white mb-2 ${fontClass}`}>{universe.name}</h3>
              <p className="text-gray-300 mb-6 line-clamp-2">{universe.description}</p>

              <div className="flex gap-4">
                <Button className="flex-1 shadow-lg hover:scale-105 transition-transform" style={{ backgroundColor: themeColor }}>
                  <Map className="w-4 h-4 mr-2" /> استكشف التاريخ
                </Button>
                <Button variant="outline" className="bg-black/40 border-white/20 hover:bg-white/10">
                  <Scroll className="w-4 h-4 mr-2" /> الجدول الزمني
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
