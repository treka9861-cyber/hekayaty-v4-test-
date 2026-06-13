import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useProduct } from "@/hooks/use-products";
import { useReviews, useCreateReview } from "@/hooks/use-reviews";
import { useUser, useUserById } from "@/hooks/use-users";
import { useAddToCart } from "@/hooks/use-cart";
import { useMediaVideos } from "@/hooks/use-media";

import { useAuth } from "@/hooks/use-auth";
import { Loader2, Star, ShieldCheck, Download, ShoppingCart, BookOpen, Truck, MapPin, Info, Sparkles, Palette, Music, Play, ArrowUpRight, ExternalLink, Globe, X, BadgeCheck } from "lucide-react";
import { useShippingRates } from "@/hooks/use-shipping";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useTranslation } from "react-i18next";
import { cn, optimizeImage } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/skeleton-loader";
import { useProductAccess } from "@/hooks/use-product-access";
import { useLibraryStatus, useAddToLibrary } from "@/hooks/use-library";
import { ReportDialog } from "@/components/ReportDialog";

export default function ProductDetails() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [customization, setCustomization] = useState("");
  const [, params] = useRoute("/book/:id");
  const id = parseInt(params?.id || "0");

  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: writer } = useUserById(product?.writerId || "");
  const { data: reviews } = useReviews(id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Reset state when navigating between products
  useEffect(() => {
    setSelectedImage(null);
    setQuantity(1);
    setCustomization("");
    setIsDescExpanded(false);
  }, [id]);

  // Unified access check via server-side engine
  const isOwner = user && product && user.id === (product as any).writerId;
  const { hasAccess, reason, planName, subscriptionExpiry, creatorUsername, isLoading: accessLoading, isExpiringSoon, isSubscriptionAccess } = useProductAccess(id);
  const { data: inLibrary, isLoading: libraryLoading } = useLibraryStatus(id);
  const addToLibrary = useAddToLibrary();

  // canAccess combines all access vectors — owner, free, purchased, subscription
  const canAccess = hasAccess;

  const addToCart = useAddToCart();

  if (productLoading || accessLoading) return <PageSkeleton />;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-background text-white">لم يتم العثور على المنتج</div>;

  const displayImage = selectedImage || product.coverUrl || (product as any).cover_url;
  const galleryImages = Array.from(new Set([
    product.coverUrl || (product as any).cover_url,
    ...((product as any).productImages || [])
  ])).filter(Boolean) as string[];

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Book",
    "name": product.title,
    "description": product.description,
    "image": displayImage,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "EGP",
      "price": (product as any).salePrice || product.price,
      "availability": "https://schema.org/InStock",
      "url": window.location.href
    },
    "aggregateRating": product.rating ? {
      "@type": "AggregateRating",
      "ratingValue": product.rating / 10,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <SEO
        title={product.title}
        description={product.description}
        image={displayImage}
        type="book"
        schema={productSchema}
      />
      <Navbar />
      
      <div className="container-responsive relative z-10 pt-28">
        <Breadcrumbs 
          items={[
            { label: t("nav.marketplace"), href: "/marketplace" },
            { label: (product as any).genre, href: `/marketplace?genre=${(product as any).genre}` },
            { label: product.title, current: true }
          ]} 
        />
      </div>

      {/* Full Page Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
        style={{ backgroundImage: `url(${displayImage})` }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      </div>

      {/* Hero / Header */}
      <div className="relative pt-32 pb-12 px-4 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10">
          {/* Cover & Gallery */}
          <div className="w-full md:w-1/2 lg:w-1/3 shrink-0 flex flex-col gap-4">
            <div
              className="aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group bg-white/5"
            >
              <AnimatePresence mode="wait">
                {displayImage ? (
                  <motion.img
                    key={displayImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    src={optimizeImage(displayImage, 800)}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('retry=')) {
                        img.src = `${img.src}${img.src.includes('?') ? '&' : '?'}retry=${Date.now()}`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {galleryImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(url)}
                    className={cn(
                      "w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                      displayImage === url ? "border-primary scale-95 shadow-lg shadow-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                {product.genre}
              </span>
              {reviews && reviews.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {(reviews.reduce((acc, r) => acc + (r.rating > 5 ? r.rating / 10 : r.rating), 0) / reviews.length).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({reviews.length} {t("productDetails.reviewCount")})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground/40 text-xs font-medium italic">
                  <Star className="w-3.5 h-3.5" /> {t("productDetails.noReviews")}
                </div>
              )}
            </div>

            {writer && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Link href={`/writer/${writer.username}`}>
                    <button className="flex items-center gap-3 p-1.5 pr-5 rounded-full bg-white/5 border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all group backdrop-blur-md shadow-lg">
                      <div className="w-9 h-9 rounded-full border border-primary/20 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                        <img
                          src={writer.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${writer.displayName}`}
                          className="w-full h-full object-cover"
                          alt={writer.displayName}
                        />
                      </div>
                      <div className="text-left text-start rtl:text-right rtl:text-end">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-primary/70 font-bold mb-0.5 leading-none">{isArabic ? "بواسطة" : "WRITTEN BY"}</p>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1 group-hover:text-primary transition-colors leading-none">
                          {writer.displayName}
                          {writer.isVerified && <BadgeCheck className="w-3 h-3 text-primary shrink-0" />}
                          <ArrowUpRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </h4>
                      </div>
                    </button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Link href="/worldbuilders">
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-primary transition-all group backdrop-blur-md shadow-lg h-[46px]">
                      <Globe className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest leading-none">
                        {t("writers.writerWorld")}
                      </span>
                    </button>
                  </Link>
                </motion.div>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">{product.title}</h1>
            <div className="relative mb-8">
              <p className={cn(
                "text-xl text-muted-foreground transition-all duration-500 whitespace-pre-wrap leading-relaxed",
                !isDescExpanded && "line-clamp-4 overflow-hidden"
              )}>
                {product.description}
              </p>
              {product.description && product.description.length > 200 && (
                <button 
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-3 flex items-center gap-2 text-primary hover:text-primary/80 font-black text-sm uppercase tracking-widest transition-all group"
                >
                  <span className="relative">
                    {isDescExpanded ? t("common.readLess", "اقرأ أقل") : t("common.readMore", "اقرأ المزيد")}
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </span>
                  <div className={cn("transition-transform duration-300", isDescExpanded ? "rotate-180" : "")}>
                    <ArrowUpRight className="w-4 h-4 opacity-70" />
                  </div>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {product.type === "physical" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {product.stockQuantity !== null && (
                      <div className={`flex items-center gap-2 font-semibold text-sm px-3 py-1 rounded-full border ${product.stockQuantity > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {product.stockQuantity > 0 ? t("productDetails.stock", { count: product.stockQuantity }) : t("productDetails.outOfStock")}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm bg-primary/10 w-fit px-3 py-1 rounded-full border border-primary/20">
                      <Truck className="w-4 h-4" />
                      {t("productDetails.physicalNote")}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center font-bold text-lg disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-lg tabular-nums">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {product.type === "merchandise" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {product.stockQuantity !== null && (
                      <div className={`flex items-center gap-2 font-semibold text-sm px-3 py-1 rounded-full border ${product.stockQuantity > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {product.stockQuantity > 0 ? t("productDetails.stock", { count: product.stockQuantity }) : t("productDetails.outOfStock")}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm bg-amber-500/10 w-fit px-3 py-1 rounded-full border border-amber-500/20">
                      <Sparkles className="w-4 h-4" />
                      {product.merchandiseCategory || t("dashboard.products.types.merchandise")}
                    </div>
                  </div>

                  {product.customFields && (
                    <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-sm font-bold text-amber-500 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        {product.customFields}
                      </label>
                      <input
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:border-amber-500/50 outline-none transition-all"
                        placeholder={t("productDetails.customizationPlaceholder")}
                        onChange={(e) => setCustomization(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/10 shadow-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center font-bold text-lg disabled:opacity-50"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-lg tabular-nums">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center font-bold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {product.type === "audiobook" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm bg-indigo-500/10 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                      <Music className="w-4 h-4" />
                      {t("productDetails.audiobook") || "Audiobook"}
                      {product.audioDuration && ` • ${Math.floor(product.audioDuration / 60)} ${t("common.minutes") || "min"}`}
                    </div>
                    <div className="flex items-center gap-2 text-green-500 font-bold text-[10px] uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      {t("productDetails.instantAccess") || "Secure Instant Access"}
                    </div>
                  </div>

                  {((product as any).audioPreviewUrl || ((product as any).audioParts?.length > 0)) && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-indigo-300 uppercase tracking-wider">{t("productDetails.audioPreview") || "Listen to Preview"}</h4>
                          <p className="text-[10px] text-muted-foreground">{t("productDetails.sampleNarration") || "Sample from the narrator"}</p>
                        </div>
                      </div>
                      <audio
                        src={(product as any).audioPreviewUrl || (product as any).audioParts[0]?.url}
                        className="w-full h-10 accent-indigo-500 opacity-80 hover:opacity-100 transition-opacity"
                        controls
                        controlsList="nodownload"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Premium Subscription Access Badge */}
              {isSubscriptionAccess && planName && (
                <div className="w-full relative group rounded-2xl overflow-hidden bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/20 p-4 mb-4 shadow-lg shadow-primary/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-primary/30" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-inner">
                         <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col text-start rtl:text-right">
                         <span className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">
                           {t("productDetails.unlockedVia", "مفتوح عبر العضوية")}
                         </span>
                         <span className="text-sm font-bold text-foreground leading-none">
                           {planName}
                         </span>
                      </div>
                    </div>
                    
                    {subscriptionExpiry && (
                       <div className="flex flex-col text-start sm:text-end rtl:sm:text-left sm:border-l sm:border-white/10 sm:pl-4 rtl:sm:border-l-0 rtl:sm:border-r rtl:sm:pl-0 rtl:sm:pr-4 shrink-0">
                         <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-bold">
                           {t("productDetails.accessEnds", "صالح حتى")}
                         </span>
                         <span className="text-xs font-bold text-white tabular-nums tracking-wide">
                           {new Date(subscriptionExpiry).toLocaleDateString()}
                         </span>
                       </div>
                    )}
                  </div>
                </div>
              )}
              {isExpiringSoon && subscriptionExpiry && (
                <div className="w-full text-[10px] text-amber-500 font-bold px-2 mb-4">
                  ⚠ عضويتك تنتهي في {new Date(subscriptionExpiry).toLocaleDateString()} — قم بالتجديد للاحتفاظ بإمكانية الوصول
                </div>
              )}
              
              {product.type === "ebook" && (
                <div className="w-full flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase tracking-widest mb-4 px-2">
                  <ShieldCheck className="w-3 h-3" />
                  {t("productDetails.digitalNote")}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {product.type === "promotional" ? (
                  <div className="w-full bg-primary/10 border border-primary/20 p-6 rounded-2xl text-center">
                    <p className="font-bold text-primary mb-1 uppercase tracking-widest text-sm">
                      {t("dashboard.products.types.promotional")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("marketplace.promotionalDesc")}
                    </p>
                  </div>
                  ) : (
                  <>
                    {canAccess ? (
                      isSubscriptionAccess && !inLibrary ? (
                        <Button 
                          onClick={() => addToLibrary.mutate(product.id)}
                          disabled={addToLibrary.isPending || libraryLoading}
                          className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 rounded-2xl transition-all hover:scale-[1.02]"
                        >
                          <BookOpen className="mr-2 w-5 h-5" />
                          {addToLibrary.isPending ? "جارٍ الإضافة..." : "أضف لمكتبتي (Add to Library)"}
                        </Button>
                      ) : (
                        <Link href={`/read/${product.id}`} className="w-full sm:w-auto">
                          <Button className="w-full h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-green-600 hover:bg-green-700 rounded-2xl transition-all hover:scale-[1.02]">
                            <BookOpen className="mr-2 w-5 h-5" />
                            {reason === 'owner' ? t("dashboard.products.editProduct", "تعديل / قراءة") : isSubscriptionAccess ? '📖 اقرأ الآن — العضوية' : t("productDetails.readNowFree")}
                          </Button>
                        </Link>
                      )
                    ) : (
                      <Button
                        onClick={() => addToCart.mutate({
                          productId: product.id,
                          quantity: quantity,
                          userId: user?.id || "1",
                          customizationData: customization ? { text: customization } : undefined
                        } as any)}
                        disabled={addToCart.isPending}
                        className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 rounded-2xl group transition-all hover:scale-[1.02]"
                      >
                        <ShoppingCart className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                        {addToCart.isPending ? t("productDetails.addingToCart") : (
                          <div className="flex flex-col items-center leading-none">
                            {(product as any).salePrice && (product as any).salePrice < (product as any).price ? (
                              <div className="flex flex-col items-start bg-black/20 px-3 py-1 rounded-lg">
                                <span className="text-[10px] text-white/50 line-through">
                                  {product.price * quantity} {t("common.egp")}
                                </span>
                                <span className="flex items-center gap-2">
                                  {t("productDetails.addToCartWithPrice", { price: (product as any).salePrice * quantity })}
                                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded animate-bounce">
                                    {((product as any).discountPercentage || 0)}% OFF
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span>
                                {t("productDetails.addToCartWithPrice", { price: product.price * quantity })}
                              </span>
                            )}
                          </div>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" /> {t("productDetails.securePayment")}
              </div>
              {product.requiresShipping || product.type === 'merchandise' || product.type === 'physical' ? (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-orange-500" /> {t("productDetails.physicalProduct")}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-500" /> {t("productDetails.instantAccess")}
                </div>
              )}
              {product.type === "asset" && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50">
                    <span className="font-semibold text-foreground">{t("productDetails.license")}:</span>
                    {product.licenseType === "commercial" ? t("dashboard.products.licenseOptions.commercial") : t("dashboard.products.licenseOptions.personal")}
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50">
                    <span className="font-semibold text-foreground">{t("productDetails.fileFormat")}:</span> ZIP / PSD
                  </div>
                </>
              )}
              {!isOwner && (
                <div className="ml-auto">
                  <ReportDialog
                    targetType="product"
                    targetId={product.id}
                    targetName={product.title}
                  />
                </div>
              )}
            </div>

            {/* Shipping Availability Section */}
            {product.type === "physical" && product.writerId && (
              <ShippingAvailability creatorId={product.writerId} />
            )}
          </div>
        </div>
      </div>

      {/* Media Integration: Watch Trailer */}
      <RelatedMedia productId={id} />

      {/* Reviews Section */}
      <div className="max-w-4xl mx-auto px-4 mt-20">
        <h2 className="text-2xl font-serif font-bold mb-8">
          {t("productDetails.readerReviews", { count: reviews?.length || 0 })}
        </h2>
        <ReviewForm productId={id} reviews={reviews} />

        <div className="space-y-6 mt-10">
          {reviews?.map((review) => (
            <div key={review.id} className="p-6 glass-card rounded-xl border border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 overflow-hidden ring-2 ring-background">
                    <img
                      src={review.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${review.user?.displayName}`}
                      className="w-full h-full object-cover"
                      alt={review.user?.displayName || "Reviewer"}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-none mb-1">{review.user?.displayName || "Reader"}</h4>
                    <div className="flex text-yellow-500 gap-1 mt-1">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < (review.rating > 5 ? Math.round(review.rating / 10) : review.rating) ? 'fill-current' : 'opacity-20'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                  {new Date(review.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm italic">"{review.comment}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related Stories Section */}
      <RelatedStories currentProduct={product} />
    </div> 

  );
}

function ShippingAvailability({ creatorId }: { creatorId: string }) {
  const { t } = useTranslation();
  const { data: rates, isLoading: isRatesLoading } = useShippingRates(creatorId);
  const { data: creator, isLoading: isCreatorLoading } = useUserById(creatorId);

  const isLoading = isRatesLoading || isCreatorLoading;

  if (isLoading) return <div className="mt-6 animate-pulse h-10 bg-muted rounded-xl" />;
  if (!rates || rates.length === 0) return null;

  return (
    <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4 text-amber-500 font-bold">
        <MapPin className="w-5 h-5" />
        <span>{t("productDetails.shippingAvailableTo")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rates.map((rate) => (
          <div key={rate.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{rate.regionName}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {rate.deliveryTimeMin}-{rate.deliveryTimeMax} {t("productDetails.businessDays")}
              </span>
            </div>
            <span className="text-primary font-bold font-serif text-sm">
              {rate.amount === 0 ? t("productDetails.free") : `${rate.amount} EGP`}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-[10px] text-muted-foreground leading-tight">
        <Info className="w-3 h-3 shrink-0 mt-0.5" />
        <p>{t("productDetails.shippingNote")}</p>
      </div>

      {creator?.shippingPolicy && (
        <div className="mt-6 pt-6 border-t border-amber-500/10 text-sm">
          <p className="font-bold text-amber-500/80 mb-2">{t("productDetails.creatorDeliveryNotes")}</p>
          <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {creator.shippingPolicy}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productId, reviews }: { productId: number, reviews?: any[] }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createReview = useCreateReview();

  const userReview = reviews?.find(r => r.userId === user?.id);
  const formSchema = insertReviewSchema.extend({
    rating: z.coerce.number(),
    userId: z.string(),
    productId: z.coerce.number(),
    comment: z.string().optional(),
  });

  type FormData = z.infer<typeof formSchema>;
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      userId: user?.id, 
      productId, 
      rating: userReview ? (userReview.rating > 5 ? userReview.rating / 10 : userReview.rating) : 5, 
      comment: userReview?.comment || "" 
    }
  });

  useEffect(() => {
    if (userReview) {
      setValue("rating", userReview.rating > 5 ? userReview.rating / 10 : userReview.rating);
      setValue("comment", userReview.comment || "");
    }
  }, [userReview, setValue]);

  if (!user) return (
    <div className="p-8 text-center glass-card rounded-2xl border border-white/10 my-10">
      <p className="text-muted-foreground mb-4">{t("productDetails.loginToReview")}</p>
      <Link href="/auth">
        <Button variant="outline" className="rounded-full px-6">{t("nav.login")}</Button>
      </Link>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit((data) => createReview.mutate(data, { 
        onSuccess: () => {
          if (!userReview) reset();
        } 
      }))}
      className="mb-12 p-8 bg-background/60 backdrop-blur-xl rounded-3xl border border-primary/10 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-focus-within:bg-primary transition-colors" />

      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        {userReview ? t("productDetails.editReview", "تعديل مراجعتك") : t("productDetails.writeReview")}
      </h3>

      <div className="space-y-6">
        <div className="relative">
          <textarea
            {...register("comment")}
            className="w-full p-5 rounded-2xl bg-background/50 border-2 border-primary/5 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all min-h-[120px] text-lg"
            placeholder={t("productDetails.reviewPlaceholder")}
          />
        </div>

        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">{t("productDetails.yourRating")}</span>
            <div className="flex justify-center items-center gap-3">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const currentRating = watch("rating") || 5;
                const isSelected = currentRating >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setValue("rating", starValue)}
                    className="relative transition-all active:scale-90 p-1 outline-none group"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-all duration-300",
                        isSelected
                          ? "text-primary fill-primary filter drop-shadow-[0_0_5px_rgba(255,184,0,0.5)]"
                          : "text-white/10 hover:text-primary/40"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-6">
            <Button
              disabled={createReview.isPending}
              className="w-full rounded-xl h-12 font-black shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest bg-primary text-black"
            >
              {createReview.isPending ? t("common.processing") : (userReview ? t("productDetails.updateReview", "تحديث المراجعة") : t("productDetails.submitReview"))}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}



function RelatedStories({ currentProduct }: { currentProduct: any }) {
  const { t } = useTranslation();
  const { data: relatedProducts } = useProducts({ genre: currentProduct.genre });
  
  const filtered = relatedProducts
    ?.filter(p => p.id !== currentProduct.id)
    .slice(0, 4);

  if (!filtered || filtered.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 mt-32 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(255,184,0,0.1)]">
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-serif font-black text-white">{t("productDetails.moreInGenre", "المزيد في هذا الكون")}</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-bold">{currentProduct.genre}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function RelatedMedia({ productId }: { productId: number }) {
  const { data: videos } = useMediaVideos({ relatedStoryId: productId });
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  if (!videos || videos.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 mt-20 relative z-10">
      <div className="flex items-center gap-4 mb-8">
         <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(255,184,0,0.1)]">
            <Play size={24} fill="currentColor" />
         </div>
         <div>
            <h2 className="text-3xl font-serif font-black text-white">Cinematic Content</h2>
            <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-bold">Trailers, Songs & More</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <motion.div
            key={video.id}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => setSelectedVideo(video)}
            className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer border border-white/5 bg-black/40 backdrop-blur-md shadow-2xl"
          >
            <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-50 group-hover:scale-100">
               <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-black shadow-2xl shadow-primary/40">
                  <Play size={28} fill="currentColor" className="ml-1" />
               </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6">
               <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-1 rounded mb-2 inline-block">
                  {video.category}
               </span>
               <h4 className="text-lg font-bold text-white drop-shadow-lg">{video.title}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden bg-black border border-white/10"
            >
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-6 right-6 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"
              >
                <X size={24} />
              </button>
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?autoplay=1&rel=0`}
                title={selectedVideo.title}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
