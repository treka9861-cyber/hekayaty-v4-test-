import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, Clock, ChevronDown, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePublisherBookClaims, useApproveBookClaim, useRejectBookClaim } from '@/hooks/use-book-claims';
import { cn } from '@/lib/utils';

type ClaimFilter = 'pending' | 'approved' | 'rejected' | 'all';

function RejectDialog({
  claimId,
  bookTitle,
  onClose,
}: {
  claimId: number;
  bookTitle: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const rejectClaim = useRejectBookClaim();

  const handleReject = async () => {
    await rejectClaim.mutateAsync({ claim_id: claimId, rejection_reason: reason });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-4"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">رفض الطلب</h3>
            <p className="text-xs text-white/40">"{bookTitle}"</p>
          </div>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="سبب الرفض (اختياري)..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/20 focus:border-red-500/30 focus:outline-none resize-none"
        />

        <div className="flex gap-3">
          <Button
            onClick={handleReject}
            disabled={rejectClaim.isPending}
            className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl"
          >
            {rejectClaim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد الرفض'}
          </Button>
          <Button onClick={onClose} variant="ghost" className="h-10 px-4 text-white/50 rounded-xl">
            إلغاء
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function BookClaimsManager() {
  const [filter, setFilter] = useState<ClaimFilter>('pending');
  const [rejectTarget, setRejectTarget] = useState<{ id: number; title: string } | null>(null);
  const approveClaim = useApproveBookClaim();

  const { data: claims, isLoading, refetch } = usePublisherBookClaims(filter);

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending:  { label: 'قيد المراجعة', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
    approved: { label: 'مقبول',         color: 'bg-green-500/10 text-green-400 border-green-500/20',  icon: CheckCircle },
    rejected: { label: 'مرفوض',         color: 'bg-red-500/10 text-red-400 border-red-500/20',        icon: XCircle },
  };

  const filters: { key: ClaimFilter; label: string }[] = [
    { key: 'pending',  label: 'قيد الانتظار' },
    { key: 'approved', label: 'مقبولة' },
    { key: 'rejected', label: 'مرفوضة' },
    { key: 'all',      label: 'الكل' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">طلبات ملكية الكتب</h2>
          <p className="text-sm text-white/40">راجع ووافق أو ارفض طلبات المؤلفين للمطالبة بكتبهم</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all border',
              filter === f.key
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white hover:border-white/20'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Claims List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : !claims || claims.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/30 font-medium">لا توجد طلبات {filter !== 'all' ? `بحالة "${filters.find(f => f.key === filter)?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {claims.map((claim: any) => {
              const cfg = statusConfig[claim.status] ?? statusConfig['pending'];
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                >
                  {/* Book Cover */}
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    {claim.book?.cover_url ? (
                      <img src={claim.book.cover_url} alt={claim.book?.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-white text-sm truncate">{claim.book?.title || 'كتاب غير معروف'}</h3>
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0', cfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Claimer */}
                    <div className="flex items-center gap-2 mb-2">
                      {claim.claimer?.avatar_url && (
                        <img src={claim.claimer.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                      )}
                      <span className="text-xs text-white/50">
                        {claim.claimer?.display_name || 'مستخدم'} · {claim.claimer?.email}
                      </span>
                    </div>

                    {/* Message */}
                    {claim.message && (
                      <p className="text-xs text-white/30 italic bg-white/[0.02] p-2 rounded-lg mb-2 line-clamp-2">
                        "{claim.message}"
                      </p>
                    )}

                    {/* Rejection Reason */}
                    {claim.rejection_reason && (
                      <p className="text-xs text-red-400/60 mb-2">
                        سبب الرفض: "{claim.rejection_reason}"
                      </p>
                    )}

                    <p className="text-[10px] text-white/20">
                      {new Date(claim.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  {claim.status === 'pending' && (
                    <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                      <Button
                        onClick={() => approveClaim.mutate(claim.id)}
                        disabled={approveClaim.isPending}
                        size="sm"
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl font-bold text-xs h-9"
                      >
                        {approveClaim.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" />موافقة</>}
                      </Button>
                      <Button
                        onClick={() => setRejectTarget({ id: claim.id, title: claim.book?.title || '' })}
                        size="sm"
                        variant="ghost"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs h-9"
                      >
                        <XCircle className="w-3 h-3 mr-1" />رفض
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {rejectTarget && (
        <RejectDialog
          claimId={rejectTarget.id}
          bookTitle={rejectTarget.title}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
