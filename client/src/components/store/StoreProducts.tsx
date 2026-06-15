import { StoreProps } from "./types";
import { Product } from "@shared/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Search, BookOpen, CheckCircle, Clock, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSort } from "@/hooks/use-sort";
import { SortSelector } from "@/components/SortSelector";
import { LazySection } from "@/lib/performance-core";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useBookClaimStatus, useSubmitBookClaim } from "@/hooks/use-book-claims";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/lib/utils";

// ─── Claim Modal ──────────────────────────────────────────────────────────────

interface ClaimModalProps {
  bookId: number;
  bookTitle: string;
  onClose: () => void;
}

function ClaimModal({ bookId, bookTitle, onClose }: ClaimModalProps) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitClaim = useSubmitBookClaim();

  const handleSubmit = async () => {
    try {
      await submitClaim.mutateAsync({ book_id: bookId, message });
      setSubmitted(true);
    } catch (_) {}
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">طلب ملكية كتاب</h2>
                <p className="text-xs text-white/40">Claim Book Authorship</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-white">تم إرسال الطلب!</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                طلبك لكتاب <span className="text-primary font-bold">"{bookTitle}"</span> قيد المراجعة لدى الناشر.
                ستصلك إشعار فور اتخاذ القرار.
              </p>
              <Button onClick={onClose} className="mt-2 w-full bg-primary hover:bg-primary/90 text-black font-bold rounded-xl">
                حسناً
              </Button>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed">أنت على وشك إرسال طلب لإثبات أنك مؤلف كتاب:</p>
                <p className="text-base font-bold text-primary mt-1">"{bookTitle}"</p>
                <p className="text-xs text-white/30 mt-2 leading-relaxed">
                  سيتلقى الناشر هذا الطلب ويراجعه. لا يتم الربط أوتوماتيكياً — يجب موافقة الناشر.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                  رسالة للناشر (اختياري)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="مثال: أنا الكاتب الأصلي لهذا الكتاب وأود المطالبة بملكيته..."
                  rows={3}
                  maxLength={400}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/20 focus:border-primary/40 focus:outline-none resize-none transition-all"
                />
                <p className="text-[10px] text-white/20 text-left">{message.length}/400</p>
              </div>

              {submitClaim.isError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {(submitClaim.error as Error)?.message || "حدث خطأ، حاول مجدداً"}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitClaim.isPending}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all hover:scale-[1.02]"
                >
                  {submitClaim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال الطلب"}
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="h-12 px-5 text-white/50 hover:text-white rounded-xl"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Claim Badge — status indicator shown on card ─────────────────────────────

function ClaimBadge({ bookId, bookTitle }: { bookId: number; bookTitle: string }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: claimStatus, isLoading } = useBookClaimStatus(user ? bookId : null, user?.id);

  if (!user || isLoading) return null;

  const status = claimStatus?.status ?? "none";

  if (status === "linked" || status === "approved") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-[11px] font-bold">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        أنت مؤلف هذا الكتاب ✓
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[11px] font-bold">
        <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        الطلب قيد المراجعة
      </div>
    );
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalOpen(true); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/50 text-primary text-[11px] font-bold transition-all duration-200 group"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform" />
        {status === "rejected" ? "أعد طلب الملكية" : "اطلب ملكية الكتاب"}
      </button>
      {modalOpen && (
        <ClaimModal bookId={bookId} bookTitle={bookTitle} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

// ─── Book Card with Claim Button ──────────────────────────────────────────────

interface ClaimableBookCardProps {
  product: Product;
  showClaimButton: boolean;
}

function ClaimableBookCard({ product, showClaimButton }: ClaimableBookCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <ProductCard product={product} />
      {showClaimButton && (
        <div className="flex justify-center">
          <ClaimBadge bookId={product.id} bookTitle={product.title} />
        </div>
      )}
    </div>
  );
}

// ─── Main StoreProducts Component ─────────────────────────────────────────────

interface StoreProductsProps extends StoreProps {
  products: Product[];
}

export function StoreProducts({ products, themeColor, isOwnStore }: StoreProductsProps) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const formats = ["all", "ebook", "physical", "audiobook", "bundle", "merchandise"];

  const filteredProducts = products.filter((p) => {
    if (filter !== "all" && p.type !== filter) {
      if (filter === "ebook" && p.type !== "ebook") return false;
      if (filter === "physical" && p.type !== "physical") return false;
    }
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const { sortBy, setSortBy, sortedItems } = useSort<Product>(filteredProducts);

  // Show the claim button only if the viewer is logged in and is NOT the store owner
  const showClaimButton = !!currentUser && !isOwnStore;

  return (
    <div className="space-y-8">
      {/* Claim feature notice for non-owners */}
      {showClaimButton && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15" dir="rtl">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-white/60 leading-relaxed">
            إذا كنت مؤلف أي من هذه الكتب، اضغط على <span className="text-primary font-bold">«اطلب ملكية الكتاب»</span> أسفل الغلاف لإرسال طلبك للناشر.
          </p>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-30 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {formats.map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              className={`rounded-full capitalize shrink-0 ${filter === f ? "shadow-lg" : "hover:bg-white/5"}`}
              style={filter === f ? { backgroundColor: themeColor } : {}}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "جميع الأعمال" : f}
            </Button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن العناوين..."
              className="pl-9 bg-black/20 border-white/10 focus-visible:ring-1"
              style={{ "--tw-ring-color": themeColor } as any}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <SortSelector value={sortBy} onValueChange={setSortBy} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sortedItems.map((product) => (
          <LazySection
            key={product.id}
            offset="400px"
            fallback={<div className="h-[450px] rounded-[20px] bg-white/5 animate-pulse" />}
          >
            <ClaimableBookCard product={product} showClaimButton={showClaimButton} />
          </LazySection>
        ))}
      </div>

      {sortedItems.length === 0 && (
        <div className="py-20 text-center glass-card rounded-3xl border border-dashed border-white/10">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2 text-white">لم يتم العثور على منتجات</h3>
          <p className="text-gray-400">حاول تعديل فلاتر البحث أو استعلام البحث.</p>
        </div>
      )}
    </div>
  );
}
