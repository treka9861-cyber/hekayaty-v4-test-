import { useState } from "react";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

type ReportTarget = "product" | "user" | "review" | "comment";

const REPORT_REASONS: Record<ReportTarget, string[]> = {
  product: [
    "محتوى غير لائق أو للبالغين",
    "بريد عشوائي أو معلومات مضللة",
    "انتهاك حقوق الطبع والنشر",
    "خطاب الكراهية أو التحرش",
    "محتوى غير قانوني",
    "آخر",
  ],
  user: [
    "انتحال الشخصية",
    "التحرش أو التنمر",
    "بريد عشوائي",
    "حساب مزيف",
    "ملف شخصي غير لائق",
    "آخر",
  ],
  review: [
    "تقييم مزيف",
    "لغة مسيئة",
    "خارج الموضوع",
    "بريد عشوائي",
    "آخر",
  ],
  comment: [
    "بريد عشوائي",
    "محتوى مسيء",
    "تحرش",
    "خارج الموضوع",
    "آخر",
  ],
};

interface ReportDialogProps {
  targetType: ReportTarget;
  targetId: string | number;
  targetName?: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function ReportDialog({
  targetType,
  targetId,
  targetName,
  trigger,
  className,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const submitReport = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: String(targetId),
          reason,
          description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "فشل في تقديم البلاغ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpen = () => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "يرجى تسجيل الدخول للإبلاغ عن المحتوى.",
        variant: "destructive",
      });
      return;
    }
    setOpen(true);
    setSubmitted(false);
    setReason("");
    setDescription("");
  };

  return (
    <>
      <div onClick={handleOpen} className={className}>
        {trigger ?? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 text-xs"
          >
            <Flag className="w-3.5 h-3.5" />
            إبلاغ
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-[#111] border border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-400" />
              الإبلاغ عن {targetType === "product" ? "القصة" : targetType === "user" ? "المستخدم" : targetType === "review" ? "التقييم" : "التعليق"}
            </DialogTitle>
            <DialogDescription>
              {targetName ? (
                <>الإبلاغ عن: <span className="text-foreground font-medium">"{targetName}"</span></>
              ) : (
                "ساعدنا في الحفاظ على أمان حكاياتي من خلال الإبلاغ عن انتهاكات إرشادات مجتمعنا."
              )}
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">تم تقديم البلاغ</h3>
              <p className="text-sm text-muted-foreground mb-6">
                شكرًا لمساعدتك في الحفاظ على أمان حكاياتي. سيقوم فريقنا بمراجعة هذا البلاغ في غضون 24-48 ساعة.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full">إغلاق</Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div>
                <label className="text-sm font-bold mb-3 block text-foreground">
                  اختر سببًا <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS[targetType].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        reason === r
                          ? "bg-red-500/10 border-red-500/40 text-red-400 font-medium"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-2 block text-foreground">
                  تفاصيل إضافية <span className="text-muted-foreground font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="قدم أي سياق إضافي قد يساعد فريقنا..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-red-500/40 transition-all resize-none h-24 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Button
                onClick={() => submitReport.mutate()}
                disabled={!reason || submitReport.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-11 font-bold"
              >
                {submitReport.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> جاري التقديم...</>
                ) : (
                  <><Flag className="w-4 h-4 mr-2" /> تقديم البلاغ</>
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                قد تؤدي البلاغات الكاذبة إلى تقييد الحساب. من خلال التقديم، أنت توافق على إرشادات مجتمعنا.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
