import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useBookClaimStatus, useSubmitBookClaim } from '@/hooks/use-book-claims';

interface BookClaimModalProps {
  bookId: number;
  bookTitle: string;
  onClose: () => void;
}

function BookClaimModal({ bookId, bookTitle, onClose }: BookClaimModalProps) {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submitClaim = useSubmitBookClaim();

  const handleSubmit = async () => {
    try {
      await submitClaim.mutateAsync({ book_id: bookId, message });
      setSubmitted(true);
    } catch (err: any) {
      // Error is shown inline
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
            /* Success State */
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
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
            /* Form State */
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white/60 leading-relaxed">
                  أنت على وشك إرسال طلب لإثبات أنك مؤلف كتاب:
                </p>
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
                  {(submitClaim.error as Error)?.message || 'حدث خطأ، حاول مجدداً'}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitClaim.isPending}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all hover:scale-[1.02]"
                >
                  {submitClaim.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'إرسال الطلب'
                  )}
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

// ─── Main Export: Smart Claim Button ─────────────────────────────────────────

interface BookClaimButtonProps {
  bookId: number;
  bookTitle: string;
  writerId: string;
}

export function BookClaimButton({ bookId, bookTitle, writerId }: BookClaimButtonProps) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: claimStatus, isLoading } = useBookClaimStatus(
    user ? bookId : null,
    user?.id
  );

  // Don't show anything if: not logged in, or user is the publisher
  if (!user || user.id === writerId) return null;
  if (isLoading) return null;

  const status = claimStatus?.status ?? 'none';

  // Already approved/linked
  if (status === 'linked' || status === 'approved') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold w-fit">
        <CheckCircle className="w-4 h-4" />
        أنت مؤلف هذا الكتاب ✓
      </div>
    );
  }

  // Pending review
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold w-fit">
        <Clock className="w-4 h-4 animate-pulse" />
        طلب الملكية قيد المراجعة
      </div>
    );
  }

  // Rejected — allow re-submission
  // (or 'none' → fresh state)
  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-primary/40 hover:bg-primary/5 text-white/60 hover:text-primary text-sm font-bold transition-all duration-300"
      >
        <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
        هذا كتابي
        {status === 'rejected' && (
          <span className="text-[10px] text-red-400/70 font-normal">(مرفوض سابقاً)</span>
        )}
      </button>

      {modalOpen && (
        <BookClaimModal
          bookId={bookId}
          bookTitle={bookTitle}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
