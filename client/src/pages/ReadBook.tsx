import { useProduct, useUpdateProduct, useProductContent } from "@/hooks/use-products";
import { useChapters } from "@/hooks/use-chapters";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, Type, Moon, Sun, Edit, Save, X, Lock, Crown, BadgeCheck, AlertTriangle } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { useProductAccess } from "@/hooks/use-product-access";

export default function ReadBook() {
    const [, params] = useRoute("/read/:id");
    const id = parseInt(params?.id || "0");
    const { data: product, isLoading: productLoading } = useProduct(id);
    const { data: fetchedContent, isLoading: contentLoading } = useProductContent(id);
    const { data: chapters, isLoading: chaptersLoading } = useChapters(id);
    const updateProduct = useUpdateProduct();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();

    const isOwner = user && product && user.id === (product as any).writerId;

    // Unified access check via server-side engine
    const { hasAccess, reason, planName, subscriptionExpiry, creatorUsername, isLoading: accessLoading, isExpiringSoon, isSubscriptionAccess } = useProductAccess(id);

    const [fontSize, setFontSize] = useState(18);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
    const [isEditing, setIsEditing] = useState(false);
    const [textContent, setTextContent] = useState("");
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);

    const isLoading = productLoading || contentLoading || chaptersLoading;

    // Initialize text content and appearance when product loads
    useEffect(() => {
        let actualContent = "";

        if (chapters && chapters.length > 0) {
            // Chapter Mode
            const chapter = chapters[activeChapterIndex];
            actualContent = chapter ? (chapter.content || "") : "";
        } else {
            // Legacy Mode
            actualContent = fetchedContent || product?.content || product?.description || "";
        }

        setTextContent(actualContent);

        if (product?.appearanceSettings) {
            const settings = product.appearanceSettings;
            if (settings.theme) setTheme(settings.theme === "sepia" ? "light" : settings.theme as any);
            if (settings.fontSize) setFontSize(settings.fontSize);
            if (settings.fontFamily) setFontFamily(settings.fontFamily as any);
        }
    }, [product, fetchedContent, chapters, activeChapterIndex]);

    const handleSave = () => {
        if (!product) return;
        updateProduct.mutate({ id: product.id, content: textContent }, {
            onSuccess: () => setIsEditing(false)
        });
    };

    // Digital Content Protection (Military-Grade Anti-Theft)
    useEffect(() => {
        if (isEditing) return; // Allow author to edit freely

        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        const handleCopy = (e: ClipboardEvent) => e.preventDefault();
        const handleSelectStart = (e: Event) => e.preventDefault();
        const handleDragStart = (e: DragEvent) => e.preventDefault();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Ctrl+C, Ctrl+S, Ctrl+U, Ctrl+P, F12, PrintScreen
            const forbiddenKeys = ['c', 's', 'u', 'p', 'i', 'j'];
            if ((e.ctrlKey || e.metaKey) && forbiddenKeys.includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            if (e.key === 'F12' || e.key === 'PrintScreen') {
                e.preventDefault();
            }
        };

        // Visibility & Focus Protection (Prevents Screen Recording/Multitasking capture)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                document.body.style.filter = 'blur(20px)';
            } else {
                document.body.style.filter = 'none';
            }
        };

        const handleWindowBlur = () => {
            document.body.style.filter = 'blur(20px)';
            document.body.classList.add('is-protected');
        };

        const handleWindowFocus = () => {
            document.body.style.filter = 'none';
            document.body.classList.remove('is-protected');
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('copy', handleCopy);
        window.addEventListener('cut', handleCopy);
        window.addEventListener('selectstart', handleSelectStart);
        window.addEventListener('dragstart', handleDragStart);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Inject Print Protection CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body { display: none !important; }
            }
            .no-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
        `;
        document.head.appendChild(style);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('copy', handleCopy);
            window.removeEventListener('cut', handleCopy);
            window.removeEventListener('selectstart', handleSelectStart);
            window.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.head.removeChild(style);
            document.body.style.filter = 'none';
        };
    }, [isEditing]);

    if (isLoading || accessLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!product) return <div>الكتاب غير موجود</div>;

    // Access gate: block non-owners who have no access
    if (!hasAccess) {
        const writerUsername = creatorUsername || (product as any).writer?.username;
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-6 bg-background px-4 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-serif font-bold">{t('reader.premiumContent', 'محتوى مميز')}</h1>
                <p className="text-muted-foreground max-w-md">
                    {t('reader.premiumDescription', 'هذا الكتاب جزء من عضوية مميزة. اشترك للحصول على وصول غير محدود لمكتبة هذا المبدع.')}
                </p>
                {writerUsername && (
                    <Link href={`/writer/${writerUsername}`}>
                        <Button size="lg" className="gap-2">
                            <Crown className="w-5 h-5" />
                            {t('reader.viewMemberships', 'عرض خطط العضوية')}
                        </Button>
                    </Link>
                )}
                <Link href="/dashboard">
                    <Button variant="ghost">{t('common.back', 'رجوع')}</Button>
                </Link>
            </div>
        );
    }

    const bgColors = {
        light: "bg-white text-gray-900 border-gray-200",
        dark: "bg-gray-900 text-gray-100 border-gray-800",
        sepia: "bg-[#f4ecd8] text-[#5b4636] border-[#e3d7bf]"
    };

    // Genre-based Thematic Overrides
    const getGenreTheme = () => {
        const genre = product.genre?.toLowerCase() || "";

        if (genre.includes("fantasy")) {
            return {
                base: theme === "light" ? "bg-[#fdfcf0] text-[#432d1d]" :
                    "bg-[#1a1b26] text-white",
                accent: theme === 'dark' ? "text-amber-400" : "text-amber-600",
                font: "font-serif",
                overlay: "bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] opacity-10"
            };
        }
        if (genre.includes("romance")) {
            return {
                base: theme === "light" ? "bg-[#fffafa] text-[#702459]" :
                    "bg-[#2d1b2d] text-white",
                accent: theme === 'dark' ? "text-pink-300" : "text-amber-600",
                font: "font-serif",
                overlay: "bg-[url('https://www.transparenttextures.com/patterns/pinstripe-light.png')] opacity-5"
            };
        }
        if (genre.includes("sci-fi") || genre.includes("scifi")) {
            return {
                base: theme === "light" ? "bg-[#f0f9ff] text-[#0c4a6e]" :
                    "bg-[#020617] text-white",
                accent: theme === 'dark' ? "text-cyan-400" : "text-amber-600",
                font: "font-sans",
                overlay: "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"
            };
        }
        if (genre.includes("horror") || genre.includes("mystery")) {
            return {
                base: theme === "light" ? "bg-[#f3f4f6] text-[#111827]" :
                    "bg-[#09090b] text-white",
                accent: "text-red-500",
                font: "font-serif",
                overlay: "bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-10"
            };
        }

        return {
            base: theme === 'light' ? bgColors.light : bgColors.dark,
            accent: theme === 'dark' ? "text-amber-400" : "text-amber-600",
            font: fontFamily === 'serif' ? 'font-serif' : 'font-sans',
            overlay: ""
        };
    };

    const gTheme = getGenreTheme();

    return (
        <div className={`min-h-screen transition-all duration-500 relative overflow-hidden ${gTheme.base}`}>
            <SEO 
                title={`${product.title}${chapters && chapters.length > 0 ? ` - ${chapters[activeChapterIndex]?.title}` : ''}`}
                description={product.description}
                image={product.coverUrl}
                type="book"
            />
            {/* Atmospheric Overlay */}
            {gTheme.overlay && <div className={`fixed inset-0 pointer-events-none z-0 ${gTheme.overlay}`} />}

            {/* Dynamic Security Watermark (Anti-Screenshot Deterrent) */}
            {!isEditing && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03] select-none flex flex-wrap justify-around items-center content-around p-10">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="text-4xl font-bold -rotate-45 whitespace-nowrap p-10">
                            {user?.displayName || user?.username || "حكاياتي محمي"} {user?.id?.slice(0, 8)}
                        </div>
                    ))}
                </div>
            )}

            <div className="relative z-10 w-full">
                {/* Reader Nav */}
                <nav className={`fixed top-0 w-full h-16 flex items-center justify-between px-4 sm:px-8 border-b z-50 transition-all duration-500 backdrop-blur-sm ${theme === 'dark' ? 'bg-gray-900/95 text-gray-100 border-gray-800' : 'bg-white/95 text-gray-900 border-gray-200'}`}>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className={cn("w-4 h-4", i18n.language === 'ar' ? 'rotate-180' : '')} /> {t("common.back")}
                        </Button>
                    </Link>

                    <h1 className={`${gTheme.font} font-bold truncate max-w-[200px] sm:max-w-md hidden sm:block ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} dir="auto">
                        {product.title}
                        {chapters && chapters.length > 0 && (
                            <span className={`font-normal mx-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                — {chapters[activeChapterIndex]?.title}
                            </span>
                        )}
                        <span className="mx-4 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-widest border border-green-500/30">
                            {t("reader.protected", "عرض محمي")}
                        </span>
                    </h1>

                    <div className="flex items-center gap-2">
                        {/* Edit Mode Toggle (Only for Author) */}
                        {user && product && user.id === product.writerId && (
                            <div className={cn("mx-2 border-r pr-2 flex items-center gap-2", i18n.language === 'ar' ? 'border-r-0 border-l pl-2' : '')}>
                                {isEditing ? (
                                    <>
                                        <Button size="sm" onClick={handleSave} disabled={updateProduct.isPending}>
                                            <Save className="w-4 h-4 mr-1" /> {t("common.save")}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                                        <Edit className="w-4 h-4 mr-2" /> {t("dashboard.products.editProduct")}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Theme Toggle */}
                        <div className="flex items-center border rounded-full p-1 gap-1">
                            <button
                                onClick={() => setTheme("light")}
                                className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${theme === 'light' ? 'bg-white shadow-sm text-black' : ''}`}
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${theme === 'dark' ? 'bg-gray-800 shadow-sm text-white' : ''}`}
                            >
                                <Moon className="w-4 h-4" />
                            </button>
                        </div>

                        <Button variant="ghost" size="icon" onClick={() => setFontFamily(f => f === 'serif' ? 'sans' : 'serif')}>
                            <Type className="w-4 h-4" />
                        </Button>
                    </div>
                </nav>

                {/* Reader Content (Focus Mode) */}
                <main className="pt-24 pb-20 px-4 sm:px-8 max-w-3xl mx-auto focus:outline-none relative" style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily === 'serif' ? 'Merriweather, serif' : 'Inter, sans-serif' }}>
                    {isEditing ? (
                        <Textarea
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            className={`min-h-[80vh] w-full p-4 ${gTheme.font} bg-transparent border-none resize-none focus-visible:ring-0 leading-loose whitespace-pre-wrap`}
                            style={{ fontSize: `${fontSize}px` }}
                            dir="auto"
                        />
                    ) : (
                        <div
                            className={cn(
                                "prose prose-lg max-w-none leading-loose whitespace-pre-wrap transition-colors duration-500 select-none",
                                theme === 'dark' ? "prose-invert text-white" : "text-gray-900",
                                gTheme.font
                            )}
                        >
                            {textContent ? (
                                <div className="no-select protected-content-reader touch-protect">
                                    {chapters && chapters.length > 0 && (
                                        <h2 className={cn("text-3xl font-serif font-bold mb-8", gTheme.accent)}>
                                            {chapters[activeChapterIndex]?.title}
                                        </h2>
                                    )}
                                    <div className="text-lg opacity-90 leading-relaxed" dir="auto">
                                        {textContent}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 opacity-50">
                                    <h2 className={gTheme.accent}>لا يوجد محتوى متاح</h2>
                                    <p className="leading-relaxed mb-6">
                                        {product.description || "لم يقم المؤلف بإضافة أي فصول بعد."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-20 flex justify-between items-center border-t py-8 opacity-50">
                        <Button
                            variant="outline"
                            disabled={activeChapterIndex === 0}
                            onClick={() => {
                                window.scrollTo(0, 0);
                                setActiveChapterIndex(prev => Math.max(0, prev - 1));
                            }}
                        >
                            {t("common.previous")}
                        </Button>
                        <span className="text-sm">
                            {chapters && chapters.length > 0 ? `${t("studio.market.serialized", "الفصل")} ${activeChapterIndex + 1} / ${chapters.length}` : t("common.end", "النهاية")}
                        </span>
                        <Button
                            variant="outline"
                            disabled={!chapters || activeChapterIndex >= chapters.length - 1}
                            onClick={() => {
                                window.scrollTo(0, 0);
                                setActiveChapterIndex(prev => prev + 1);
                            }}
                        >
                            {t("common.next")}
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    )
}
