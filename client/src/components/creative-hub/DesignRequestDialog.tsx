import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDesignRequestSchema } from "@shared/schema";
import { useCreateDesignRequest } from "@/hooks/use-commissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Calendar, DollarSign, ShieldCheck, Image as ImageIcon, X } from "lucide-react";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { useTranslation } from "react-i18next";

export function DesignRequestDialog({ artistId, artistName, isOpen, onOpenChange }: {
    artistId: string,
    artistName: string,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation();
    const createRequest = useCreateDesignRequest();

    const [refs, setRefs] = useState<string[]>([]);

    const form = useForm({
        resolver: zodResolver(insertDesignRequestSchema),
        defaultValues: {
            artistId,
            title: "",
            description: "",
            budget: 500,
            licenseType: "personal",
            status: "pending",
            deadline: "",
            referenceImages: [] as string[]
        }
    });

    const onSubmit = async (data: any) => {
        await createRequest.mutateAsync({ ...data, referenceImages: refs });
        onOpenChange(false);
        form.reset();
        setRefs([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] glass border-white/10 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
                <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-white/10 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-serif flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" />
                            Request a Custom Design
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Work directly with {artistName} to bring your creative vision to life.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                Project Title
                            </label>
                            <Input {...form.register("title")} placeholder="e.g. Book Cover Design" className="bg-background/50" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                <DollarSign className="w-3 h-3" /> Budget (EGP)
                            </label>
                            <Input type="number" {...form.register("budget", { valueAsNumber: true })} className="bg-background/50" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                Detailed Description
                            </label>
                            <Textarea
                                {...form.register("description")}
                                placeholder="Describe your project, style preferences, and any specific requirements..."
                                className="min-h-[120px] bg-background/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                Reference Images (Optional)
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {refs.map((url, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-white/10">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setRefs(p => p.filter((_, idx) => idx !== i))}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <CloudinaryUpload
                                onUpload={(url) => setRefs(p => [...p, url])}
                                label="Upload Reference"
                            // Assuming CloudinaryUpload component is available
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                License Type
                            </label>
                            <Select onValueChange={(v) => form.setValue("licenseType", v)} defaultValue="personal">
                                <SelectTrigger className="bg-background/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="personal">استخدام شخصي</SelectItem>
                                    <SelectItem value="commercial">حقوق تجارية</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter opacity-70">
                                <Calendar className="w-3 h-3" /> Estimated Deadline
                            </label>
                            <Input type="date" {...form.register("deadline")} className="bg-background/50" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            <strong>Secure Escrow:</strong> Your payment will be locked safely by the platform and only released once you approve the final delivery.
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>إلغاء</Button>
                        <Button type="submit" disabled={createRequest.isPending} className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20">
                            {createRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Send Request"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
