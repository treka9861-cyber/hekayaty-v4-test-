import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Feather, BookOpen, PenTool, Info, Layers, LayoutGrid,
  ShoppingBag, ChevronLeft, ChevronRight, Play, Sparkles, Users,
} from "lucide-react";
import { useTopWriters, useUserById, usePlatformStats } from "@/hooks/use-users";
import { useBestSellerProducts, useSerializedProducts, useProducts } from "@/hooks/use-products";
import { useCollections } from "@/hooks/use-collections";
import { useMediaVideos } from "@/hooks/use-media";
import { FeaturedWriter } from "@/components/FeaturedWriter";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { GridSkeleton, HeroSkeleton } from "@/components/ui/skeleton-loader";
import { Button } from "@/components/ui/button";

// ---------- 3D Card Fan Slider ----------
interface BookSliderProps {
  books: any[];
}

function BookSlider({ books }: BookSliderProps) {
  const [current, setCurrent] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Sort latest to oldest (extra safeguard on top of server-side ordering)
  const sortedBooks = React.useMemo(
    () => [...books].sort((a, b) => {
      const da = new Date(a.createdAt || a.created_at || 0).getTime();
      const db = new Date(b.createdAt || b.created_at || 0).getTime();
      return db - da;
    }),
    [books]
  );

  const total = sortedBooks.length;

  const getIndex = (offset: number) => ((current + offset) % total + total) % total;

  const startTimer = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => ((prev + 1) % total + total) % total);
    }, 3500);
  }, [total]);

  const go = React.useCallback(
    (dir: 1 | -1) => {
      if (isAnimating || total === 0) return;
      setIsAnimating(true);
      setCurrent((prev) => ((prev + dir) % total + total) % total);
      setTimeout(() => setIsAnimating(false), 500);
      startTimer(); // reset auto-advance on manual nav
    },
    [isAnimating, total, startTimer]
  );

  const jumpTo = React.useCallback(
    (idx: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrent(idx);
      setTimeout(() => setIsAnimating(false), 500);
      startTimer();
    },
    [isAnimating, startTimer]
  );

  // Auto-advance
  React.useEffect(() => {
    if (total === 0) return;
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer, total]);

  if (total === 0) {
    return (
      <div className="w-full h-[420px] flex items-center justify-center">
        <div className="w-52 h-80 rounded-3xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  const currentBook = sortedBooks[current];
  const isNew = currentBook?.createdAt
    ? (Date.now() - new Date(currentBook.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false;

  // Dot indicators: show up to 10 dots
  const DOT_LIMIT = 10;
  const showDots = total <= DOT_LIMIT;
  // For large sets, show a "page" of dots around current
  const dotStart = showDots ? 0 : Math.max(0, Math.min(current - 4, total - DOT_LIMIT));
  const dotItems = showDots
    ? sortedBooks
    : sortedBooks.slice(dotStart, dotStart + DOT_LIMIT);

  // Config for each visible card position relative to center (offset = -2..+2)
  const cardConfigs = [
    { offset: -2, xPct: -88, rotate: 22,  scale: 0.60, opacity: 0.30, zIndex: 1 },
    { offset: -1, xPct: -48, rotate: 11,  scale: 0.80, opacity: 0.65, zIndex: 2 },
    { offset:  0, xPct:   0, rotate:  0,  scale: 1.00, opacity: 1.00, zIndex: 5 },
    { offset:  1, xPct:  48, rotate: -11, scale: 0.80, opacity: 0.65, zIndex: 2 },
    { offset:  2, xPct:  88, rotate: -22, scale: 0.60, opacity: 0.30, zIndex: 1 },
  ];

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      {/* Perspective container */}
      <div
        className="relative"
        style={{ width: 240, height: 380, perspective: "1200px" }}
      >
        {cardConfigs.map(({ offset, xPct, rotate, scale, opacity, zIndex }) => {
          const book = sortedBooks[getIndex(offset)];
          const isCurrent = offset === 0;

          return (
            <div
              key={`${getIndex(offset)}-${offset}`}
              onClick={() => {
                if (offset === -1) go(-1);
                else if (offset === 1) go(1);
                else if (offset === 0 && book?.id) window.location.href = `/book/${book.id}`;
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transform: `translateX(${xPct}%) rotateY(${rotate}deg) scale(${scale})`,
                opacity,
                zIndex,
                transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                cursor: "pointer",
                transformStyle: "preserve-3d",
                transformOrigin: "center center",
              }}
            >
              {/* Card */}
              <div
                className={cn(
                  "w-full h-full rounded-[2rem] overflow-hidden border shadow-2xl",
                  isCurrent
                    ? "border-[#F5C000]/60 shadow-[0_0_60px_rgba(245,192,0,0.25)]"
                    : "border-white/10"
                )}
                style={{ background: "#0a0a0a" }}
              >
                {/* Top badges */}
                {isCurrent && (
                  <>
                    {/* NEW badge for recent books */}
                    {isNew && (
                      <div className="absolute top-5 right-5 z-20 px-3 py-1 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-tight">
                        جديد ✦
                      </div>
                    )}
                    {!isNew && (
                      <div className="absolute top-5 right-5 z-20 px-3 py-1 rounded-lg bg-[#F5C000] text-black text-[10px] font-black uppercase tracking-tight">
                        حكايتي
                      </div>
                    )}
                    <button className="absolute top-5 left-5 z-20 w-9 h-9 rounded-full bg-[#F5C000] flex items-center justify-center shadow-lg">
                      <Feather className="w-4 h-4 text-black fill-black" />
                    </button>
                  </>
                )}

                {/* Image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10" />
                <img
                  src={book?.coverUrl || book?.cover_url || "/images/placeholder-book.png"}
                  alt={book?.title || ""}
                  className="w-full h-full object-cover"
                  loading="eager"
                />

                {/* Title on center card */}
                {isCurrent && book?.title && (
                  <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
                    <p className="text-white text-sm font-bold leading-tight text-center line-clamp-2 drop-shadow-lg">
                      {book.title}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-6 mt-10">
        <button
          onClick={() => go(-1)}
          className="w-11 h-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#F5C000]/10 hover:border-[#F5C000]/30 active:scale-95 transition-all"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1 items-center">
          {dotItems.map((_, i) => {
            const realIdx = dotStart + i;
            return (
              <button
                key={realIdx}
                onClick={() => jumpTo(realIdx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  current === realIdx ? "w-4 bg-[#F5C000]" : "w-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            );
          })}
          {!showDots && (
            <span className="text-white/30 text-[9px] font-bold ml-1">
              {current + 1}/{total}
            </span>
          )}
        </div>

        <button
          onClick={() => go(1)}
          className="w-11 h-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#F5C000]/10 hover:border-[#F5C000]/30 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      </div>
    </div>
  );
}


// ---------- Main Component ----------
export default function Home() {
  const { data: writers } = useTopWriters(8);
  const { data: bestSellers } = useBestSellerProducts(8);
  const { data: serializedStories } = useSerializedProducts(8);
  const { data: collections } = useCollections({ isPublished: true });
  const { data: mediaHub } = useMediaVideos();
  const { data: merchandise } = useProducts({ type: "merchandise" });
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  // Fetch ALL books for the slider as requested
  const { data: allBooksRaw } = useProducts({ isPublished: true });
  const allBooks = React.useMemo(() => (allBooksRaw || []), [allBooksRaw]);
  const { data: stats } = usePlatformStats();

  const writersMap = React.useMemo(
    () => Object.fromEntries(writers?.map((w) => [w.id, w.displayName]) || []),
    [writers]
  );

  React.useEffect(() => {
    document.body.classList.add("is-homepage");
    return () => { document.body.classList.remove("is-homepage"); };
  }, []);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hekayaty",
    url: "https://hekayaty.com",
    logo: "https://hekayaty.com/logo.png",
    sameAs: ["https://twitter.com/Hekayaty", "https://www.youtube.com/@Hekayaty-q2i"],
    description: "The ultimate universe for storytellers and worldbuilders.",
  };



  return (
    <div className="min-h-screen bg-[#000000] text-right" dir="rtl">
      <SEO
        title="Home"
        description="الكون الجامع لكل الرواة. أنشئ مكتبتك الرقمية الخاصة، تواصل مع القراء، وبع قصصك مباشرة."
        schema={organizationSchema}
      />
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[100dvh] flex flex-col overflow-hidden bg-[#050505]">

        {/* Atmospheric background glow */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Centre amber radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#7a4a00]/20 rounded-full blur-[140px]" />
          {/* Right glow (behind slider) */}
          <div className="absolute top-0 right-0 w-[600px] h-[100%] bg-[#3d2500]/30 blur-[100px]" />
          {/* Left dark gradient */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#000] via-[#000]/80 to-transparent" />
          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#000] to-transparent" />
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
          />
        </div>

        {/* Main grid */}
        <div className="relative z-10 flex-1 container-responsive grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center pt-28 pb-8">

          {/* ── LEFT: Text Content ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="flex flex-col items-center lg:items-start text-center lg:text-right gap-7 order-2 lg:order-2"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-[#F5C000]/20 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-[#F5C000]" />
              <span className="text-sm font-bold text-[#F5C000]">الكون الجامع لكل الرواة</span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-0">
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-8xl font-serif font-black text-white leading-[1.05] tracking-tight">
                لكل كاتب
              </h1>
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-8xl font-serif font-black leading-[1.05] tracking-tight"
                  style={{ color: "#F5C000", textShadow: "0 0 60px rgba(245,192,0,0.35)" }}>
                عالم يستحقه
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-white/55 max-w-md leading-relaxed">
              أنشئ مكتبتك الرقمية الخاصة، تواصل مع القراء، وبع قصصك مباشرة.
              لا حواجز، فقط سحر الكلمات.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-2">
              <Link href="/marketplace" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full h-13 px-7 bg-[#F5C000] hover:bg-[#F5C000]/90 text-black font-black text-base rounded-xl gap-2
                             shadow-[0_0_24px_rgba(245,192,0,0.35)] hover:shadow-[0_0_40px_rgba(245,192,0,0.55)] transition-all duration-300"
                >
                  <BookOpen className="w-5 h-5" />
                  استكشف بوابة الحكايات
                </Button>
              </Link>

              <Link href="/guide" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-13 px-7 border-white/12 bg-white/5 hover:bg-white/10 text-white font-bold text-base rounded-xl gap-2 backdrop-blur-md transition-all duration-300"
                >
                  <Info className="w-5 h-5 text-[#F5C000]" />
                  دليل المنصة
                </Button>
              </Link>

              <Link href="/media" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-13 px-7 border-white/12 bg-white/5 hover:bg-white/10 text-white font-bold text-base rounded-xl gap-2 backdrop-blur-md transition-all duration-300"
                >
                  <Play className="w-5 h-5 fill-white" />
                  بوابة العروض (Media Hub)
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* ── RIGHT: 3D Card Slider ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
            className="flex items-center justify-center order-1 lg:order-1 py-4"
          >
            <BookSlider books={allBooks || []} />
          </motion.div>
        </div>

        {/* ── STATS BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 mt-8 mb-6 flex flex-row justify-center gap-3 px-4"
        >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 backdrop-blur-md shadow-2xl hover:border-[#F5C000]/50 hover:bg-white/10 transition-all duration-300 group flex-1 max-w-[200px]">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#F5C000]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(245,192,0,0.2)] shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-[#F5C000]" strokeWidth={2} />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xl sm:text-3xl font-black text-white leading-none tracking-tight">500K+</span>
                <span className="text-xs sm:text-sm text-white/60 font-medium mt-0.5">قارئ نشط</span>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 backdrop-blur-md shadow-2xl hover:border-[#F5C000]/50 hover:bg-white/10 transition-all duration-300 group flex-1 max-w-[200px]">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#F5C000]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(245,192,0,0.2)] shrink-0">
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-[#F5C000]" strokeWidth={2} />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xl sm:text-3xl font-black text-white leading-none tracking-tight">{stats?.books ? `${stats.books}+` : '230+'}</span>
                <span className="text-xs sm:text-sm text-white/60 font-medium mt-0.5">قصة وكتاب</span>
              </div>
            </div>
        </motion.div>
      </section>

      {/* ===== BEST SELLERS ===== */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[#000000] section-offscreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-2 sm:mb-4">{t("home.bestSellers.title")}</h2>
              <p className="text-muted-foreground text-sm sm:text-base">{t("home.bestSellers.subtitle")}</p>
            </div>
            <Link href="/marketplace">
              <button className="text-primary font-medium hover:underline flex items-center gap-1 sm:gap-2 text-sm">
                {t("home.bestSellers.viewAll")} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {bestSellers?.map((product) => (
              <ProductCard key={product.id} product={product} />
            )) || <GridSkeleton count={8} />}
            {bestSellers && bestSellers.length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground py-10">
                {t("home.bestSellers.empty")}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== MEDIA HUB ===== */}
      <section className="py-20 sm:py-32 relative overflow-hidden bg-[#000000] section-offscreen">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 sm:mb-16 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <Play className="w-3 h-3 fill-primary" />
                {t("nav.mediaHub")}
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-black text-white leading-tight">
                {t("blog.posts.post1.category", "سينمائي")} <span className="text-primary">{t("nav.mediaHub")}</span>
              </h2>
              <p className="text-white/40 max-w-xl text-base sm:text-lg">
                {t("blog.subtitle", "عش القصص أبعد من الصفحات.")}
              </p>
            </div>
            <Link href="/media">
              <Button variant="outline" className="rounded-full px-8 h-12 border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all">
                {t("home.bestSellers.viewAll")}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mediaHub?.slice(0, 6).map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative aspect-video rounded-[2rem] overflow-hidden border border-white/10 bg-white/5 hover:border-primary/40 transition-all duration-500 shadow-2xl"
              >
                <img src={video.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={video.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                  <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer"
                     className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_30px_rgba(245,192,0,0.5)] hover:scale-110 active:scale-95 transition-all">
                    <Play className="w-6 h-6 fill-black" />
                  </a>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">
                    {t(`dashboard.products.types.${video.category}`)}
                  </span>
                  <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{video.title}</h3>
                </div>
              </motion.div>
            ))}
            {!mediaHub && Array(6).fill(0).map((_, i) => (
              <div key={i} className="aspect-video rounded-[2rem] bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* ===== MERCHANDISE ===== */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[#000000] section-offscreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <ShoppingBag className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-1 sm:mb-2">{t("home.merchandise.title")}</h2>
                <p className="text-muted-foreground text-sm sm:text-base">{t("home.merchandise.subtitle")}</p>
              </div>
            </div>
            <Link href="/marketplace?type=merchandise">
              <button className="text-amber-500 font-medium hover:underline flex items-center gap-1 sm:gap-2 text-sm">
                {t("home.bestSellers.viewAll")} <ArrowRight className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", i18n.language === "ar" ? "rotate-180" : "")} />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {merchandise?.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            )) || <GridSkeleton count={8} />}
            {merchandise && merchandise.length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground py-10">{t("home.merchandise.empty")}</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== ONGOING SERIES ===== */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[#000000] border-y border-white/5 section-offscreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Layers className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-1 sm:mb-2">{t("home.serialized.title")}</h2>
                <p className="text-muted-foreground text-sm sm:text-base">{t("home.serialized.subtitle")}</p>
              </div>
            </div>
            <Link href="/marketplace?isSerialized=true">
              <button className="text-primary font-medium hover:underline flex items-center gap-1 sm:gap-2 text-sm">
                {t("home.bestSellers.viewAll")} <ArrowRight className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", i18n.language === "ar" ? "rotate-180" : "")} />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {serializedStories?.map((product) => (
              <ProductCard key={product.id} product={product} />
            )) || <GridSkeleton count={8} />}
            {serializedStories && serializedStories.length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground py-10">{t("home.serialized.empty")}</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== COLLECTIONS ===== */}
      <section className="py-16 sm:py-24 relative overflow-hidden bg-[#000000] border-b border-white/5 section-offscreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-2xl bg-secondary/20 text-secondary border border-secondary/20 shadow-xl shadow-secondary/10">
                <LayoutGrid className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-1 sm:mb-2">{t("home.collections.title")}</h2>
                <p className="text-muted-foreground text-sm sm:text-base">{t("home.collections.subtitle")}</p>
              </div>
            </div>
            <Link href="/marketplace?type=collection">
              <button className="text-secondary font-bold hover:underline flex items-center gap-1 sm:gap-2 text-sm px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 transition-all hover:bg-secondary/20">
                {t("home.bestSellers.viewAll")} <ArrowRight className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", i18n.language === "ar" ? "rotate-180" : "")} />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {collections?.slice(0, 8).map((c) => (
              <ProductCard key={c.id} collection={c} />
            )) || <GridSkeleton count={8} />}
            {collections && collections.length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground py-10">{t("home.collections.empty")}</p>
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURED WRITERS ===== */}
      <section className="py-16 sm:py-24 bg-[#000000] relative section-offscreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-2 sm:mb-4">{t("home.featuredWriters.title")}</h2>
              <p className="text-muted-foreground text-sm sm:text-base">{t("home.featuredWriters.subtitle")}</p>
            </div>
            <Link href="/worldbuilders">
              <button className="text-primary font-medium hover:underline flex items-center gap-1 sm:gap-2 text-sm">
                {t("home.featuredWriters.viewAll")} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {writers?.map((writer) => (
              <FeaturedWriter key={writer.id} writer={writer} showStats={false} />
            )) || Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-60 sm:h-80 rounded-2xl bg-card/50 animate-pulse" />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA (guests only) ===== */}
      {!user && (
        <section className="py-20 sm:py-32 relative overflow-hidden section-offscreen">
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 sm:mb-6 text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)]">
              {t("home.cta.title")}
            </h2>
            <p className="text-base sm:text-xl text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-8 sm:mb-10">
              {t("home.cta.subtitle")}
            </p>
            <Link href="/auth?mode=register">
              <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-foreground text-background font-bold text-base sm:text-lg hover:scale-105 transition-transform">
                {t("home.cta.button")}
              </button>
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
