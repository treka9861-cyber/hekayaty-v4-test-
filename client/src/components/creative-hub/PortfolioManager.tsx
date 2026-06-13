import { useState } from "react";
import { usePortfolios, useCreatePortfolio } from "@/hooks/use-commissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Image as ImageIcon, ExternalLink, Library } from "lucide-react";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { useTranslation } from "react-i18next";
import { useDeletePortfolio } from "@/hooks/use-commissions";

export function PortfolioManager({ artistId }: { artistId: string }) {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const { data: portfoliosResponse, isLoading } = usePortfolios(artistId, "All", page);
    const createPortfolio = useCreatePortfolio();
    const deletePortfolio = useDeletePortfolio();
    const [isOpen, setIsOpen] = useState(false);
    const [newWork, setNewWork] = useState({
        title: "",
        description: "",
        categoryId: "Cover",
        imageUrl: "",
        additionalImages: [] as string[],
        tags: "",
        yearCreated: new Date().getFullYear().toString()
    });

    const categories = ["Cover", "Character", "Map", "UI", "Branding", "Other"];

    const handleCreate = async () => {
        if (!newWork.imageUrl || !newWork.title) return;
        await createPortfolio.mutateAsync({
            ...newWork,
            category: newWork.categoryId, // API expects 'category', schema might use different name but kept consistent with existing code
            artistId,
            orderIndex: (portfoliosResponse?.total || 0) + 1
        });
        setIsOpen(false);
        setNewWork({ title: "", description: "", categoryId: "Cover", imageUrl: "", additionalImages: [], tags: "", yearCreated: new Date().getFullYear().toString() });
    };

    if (isLoading) return <Loader2 className="w-8 h-8 animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold font-serif">{t("portfolio.title") || "My Portfolio"}</h2>
                    <p className="text-muted-foreground">{t("portfolio.desc") || "Showcase your best creative works to potential clients."}</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> {t("portfolio.addWork") || "Add New Work"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{t("portfolio.addWork") || "Add New Work"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">عنوان العمل</label>
                                <Input value={newWork.title} onChange={e => setNewWork(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Epic Fantasy Map" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">التصنيف</label>
                                <Select value={newWork.categoryId} onValueChange={v => setNewWork(p => ({ ...p, categoryId: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">رفع صورة</label>
                                <CloudinaryUpload
                                    onUpload={(url) => setNewWork(p => ({ ...p, imageUrl: url }))}
                                    label="Upload High-Res Image"
                                />
                            </div>

                            {/* Additional Images Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Additional Images (Optional)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {newWork.additionalImages.map((img, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                                            <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx + 1}`} />
                                            <button
                                                onClick={() => setNewWork(p => ({ ...p, additionalImages: p.additionalImages.filter((_, i) => i !== idx) }))}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {newWork.additionalImages.length < 5 && (
                                        <div className="aspect-square">
                                            <CloudinaryUpload
                                                key={`add-img-${newWork.additionalImages.length}`}
                                                onUpload={(url) => {
                                                    if (url) setNewWork(p => ({ ...p, additionalImages: [...p.additionalImages, url] }));
                                                }}
                                                label=""
                                                className="h-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">سنة الإنشاء</label>
                                    <Input value={newWork.yearCreated} onChange={e => setNewWork(p => ({ ...p, yearCreated: e.target.value }))} placeholder="e.g. 2024" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tags (comma separated)</label>
                                    <Input value={newWork.tags} onChange={e => setNewWork(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. fantasy, dark, epic" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">الوصف</label>
                                <Textarea value={newWork.description} onChange={e => setNewWork(p => ({ ...p, description: e.target.value }))} placeholder="Briefly describe this work..." />
                            </div>
                            <Button onClick={handleCreate} disabled={createPortfolio.isPending} className="w-full">
                                {createPortfolio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish to Portfolio"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfoliosResponse?.data?.map((item) => {
                    const additionalImages = (item.additionalImages as string[]) || [];
                    return (
                        <Card key={item.id} className="overflow-hidden glass-card border-white/10 group">
                            <div className="aspect-[4/3] relative overflow-hidden">
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />

                                {/* Multi-image Badge */}
                                {additionalImages.length > 0 && (
                                    <div className="absolute top-2 right-2 z-10">
                                        <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-white/10 gap-1.5 py-1">
                                            <Library className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">{additionalImages.length + 1}</span>
                                        </Badge>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button variant="secondary" size="icon" className="rounded-full">
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full bg-red-500/80 hover:bg-red-500"
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this work?")) {
                                                deletePortfolio.mutate(item.id);
                                            }
                                        }}
                                        disabled={deletePortfolio.isPending}
                                    >
                                        {deletePortfolio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <div className="absolute top-2 left-2 flex gap-2">
                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                        {item.category}
                                    </span>
                                    {item.yearCreated && (
                                        <span className="px-2 py-1 bg-primary/60 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                            {item.yearCreated}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-bold truncate">{item.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
                {(!portfoliosResponse?.data || portfoliosResponse.data.length === 0) && (
                    <div className="col-span-full py-20 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p>Your portfolio is currently a blank canvas.</p>
                    </div>
                )}
            </div>

            {portfoliosResponse && portfoliosResponse.total > 12 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >السابق</Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={portfoliosResponse.data.length < 12}
                    >التالي</Button>
                </div>
            )}
        </div>
    );
}
