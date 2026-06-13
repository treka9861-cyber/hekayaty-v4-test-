import { useState } from "react";
import { useAdminBroadcastNotification, useAdminSettings, useAdminUpdateSettings } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Megaphone, Send, Star, Save } from "lucide-react";

export function MarketingAdmin() {
    const broadcast = useAdminBroadcastNotification();
    const { data: settings } = useAdminSettings();
    const updateSettings = useAdminUpdateSettings();

    const [notifTitle, setNotifTitle] = useState("");
    const [notifMessage, setNotifMessage] = useState("");
    const [notifType, setNotifType] = useState("info");
    const [notifTarget, setNotifTarget] = useState("all");

    const [featuredIds, setFeaturedIds] = useState<string>("");

    // Load featured ids from settings on init
    useState(() => {
        if (settings) {
            const setting = settings.find((s: any) => s.key === 'featured_product_ids');
            if (setting && Array.isArray(setting.value)) {
                setFeaturedIds(setting.value.join(", "));
            }
        }
    });

    const handleBroadcast = () => {
        if (!notifTitle || !notifMessage) return;
        broadcast.mutate(
            { title: notifTitle, message: notifMessage, type: notifType, targetRole: notifTarget },
            { onSuccess: () => { setNotifTitle(""); setNotifMessage(""); } }
        );
    };

    const handleSaveFeatured = () => {
        const ids = featuredIds.split(",").map(s => parseInt(s.trim())).filter(id => !isNaN(id));
        updateSettings.mutate({ key: 'featured_product_ids', value: ids });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold font-serif">التسويق والنمو</h2>
                    <p className="text-muted-foreground">إدارة الإشعارات العامة والمحتوى المُميز.</p>
                </div>
            </div>

            <Card className="glass-card border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-emerald-400" />
                        بث إشعار عام
                    </CardTitle>
                    <CardDescription>إرسال إشعار داخل التطبيق لجميع المستخدمين أو أدوار محددة.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>العنوان</Label>
                            <Input 
                                placeholder="مثال: تحديث ميزة جديدة!" 
                                value={notifTitle}
                                onChange={(e) => setNotifTitle(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>الجمهور المستهدف</Label>
                            <Select value={notifTarget} onValueChange={setNotifTarget}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-white/10">
                                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                                    <SelectItem value="writer">الكتاب فقط</SelectItem>
                                    <SelectItem value="reader">القراء فقط</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>نوع الإشعار</Label>
                        <Select value={notifType} onValueChange={setNotifType}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/10">
                                <SelectItem value="info">معلومات (أزرق)</SelectItem>
                                <SelectItem value="success">نجاح (أخضر)</SelectItem>
                                <SelectItem value="warning">تحذير (أصفر)</SelectItem>
                                <SelectItem value="marketing">تسويق (أساسي)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>محتوى الرسالة</Label>
                        <Textarea 
                            placeholder="اكتب الإعلان هنا..."
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            className="bg-white/5 border-white/10 h-24 resize-none"
                        />
                    </div>
                </CardContent>
                <CardFooter className="bg-white/5 border-t border-white/5 pt-4">
                    <Button 
                        onClick={handleBroadcast} 
                        disabled={broadcast.isPending || !notifTitle || !notifMessage}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                    >
                        {broadcast.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        بث الآن
                    </Button>
                </CardFooter>
            </Card>

            <Card className="glass-card border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400" />
                        تنظيم القصص المميزة
                    </CardTitle>
                    <CardDescription>حدد القصص التي تظهر في عرض الصفحة الرئيسية الكبير.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>معرفات المنتجات (مفصولة بفواصل)</Label>
                        <div className="flex gap-3">
                            <Input 
                                placeholder="مثال: 12, 45, 89" 
                                value={featuredIds}
                                onChange={(e) => setFeaturedIds(e.target.value)}
                                className="bg-white/5 border-white/10 font-mono"
                            />
                            <Button onClick={handleSaveFeatured} disabled={updateSettings.isPending} className="bg-amber-600 hover:bg-amber-700 gap-2">
                                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                حفظ المميزة
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">ابحث عن معرفات المنتجات بعرض قصة وفحص الرابط (مثال: /product/12).</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
