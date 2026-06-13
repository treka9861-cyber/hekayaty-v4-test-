import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProducts, useProduct, useUpdateProduct, useCreateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useChapters, useCreateChapter, useUpdateChapter, useDeleteChapter } from "@/hooks/use-chapters";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch as UISwitch } from "@/components/ui/switch";
import {
    Book,
    Settings,
    Palette,
    Eye,
    Save,
    Plus,
    ChevronLeft,
    PenTool,
    Layout,
    Type,
    Layers,
    ExternalLink,
    Loader2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    Library,
    Search
} from "lucide-react";
import { Link, useRoute, useLocation, Redirect } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { useCollections, useCreateCollection, useDeleteCollection } from "@/hooks/use-collections";
import { CollectionEditor } from "@/components/studio/CollectionEditor";

export default function WriterStudio() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [, params] = useRoute("/studio/:id?");
    const [, setLocation] = useLocation();
    const selectedId = params?.id ? (params.id.startsWith('c-') ? null : parseInt(params.id)) : null;
    const selectedCollectionId = params?.id?.startsWith('c-') ? params.id.replace('c-', '') : null;

    const [viewMode, setViewMode] = useState<'stories' | 'collections'>(selectedCollectionId ? 'collections' : 'stories');
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("write");
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");
    const [genre, setGenre] = useState("");
    const [price, setPrice] = useState(0);
    const [description, setDescription] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [isSerialized, setIsSerialized] = useState(false);
    const [seriesStatus, setSeriesStatus] = useState("ongoing");
    const [coverUrl, setCoverUrl] = useState("");

    const { data: products, isLoading: productsLoading } = useProducts({
        writerId: user?.id,
        type: 'ebook'
    });

    const { data: currentProduct, isLoading: productLoading } = useProduct(selectedId || 0);

    // Collections Hooks
    const { data: collections, isLoading: collectionsLoading } = useCollections({ writerId: user?.id });
    const createCollection = useCreateCollection();
    const deleteCollection = useDeleteCollection();

    const [appSettings, setAppSettings] = useState<any>({
        theme: 'light',
        fontFamily: 'serif',
        fontSize: 18,
        lineHeight: 1.8
    });

    const { data: chapters, isLoading: chaptersLoading } = useChapters(selectedId || 0);
    const createChapter = useCreateChapter();
    const updateChapter = useUpdateChapter();
    const deleteChapter = useDeleteChapter();
    const deleteProduct = useDeleteProduct();

    const filteredProducts = products?.filter((p: any) => 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const filteredCollections = collections?.filter((c: any) => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const [activeChapterId, setActiveChapterId] = useState<number | null>(null);

    // Initial load for Stories
    useEffect(() => {
        if (currentProduct) {
            setTitle(currentProduct.title || "");
            setGenre(currentProduct.genre || "");
            setPrice(currentProduct.price || 0);
            setIsFree(currentProduct.price === 0);
            setIsSerialized(currentProduct.isSerialized || false);
            setSeriesStatus(currentProduct.seriesStatus || "ongoing");
            setDescription(currentProduct.description || "");
            setCoverUrl(currentProduct.coverUrl || "");
            if (currentProduct.appearanceSettings) {
                setAppSettings(currentProduct.appearanceSettings);
            }
        }
    }, [currentProduct]);

    // Chapter Sync
    useEffect(() => {
        if (chapters && chapters.length > 0) {
            if (!activeChapterId) {
                setActiveChapterId(chapters[0].id);
                setContent(chapters[0].content || "");
            }
        } else if (currentProduct) {
            setContent(currentProduct.content || "");
        }
    }, [chapters, currentProduct, activeChapterId]);

    const handleChapterSelect = (id: number) => {
        setActiveChapterId(id);
        const chapter = chapters?.find(c => c.id === id);
        if (chapter) setContent(chapter.content || "");
    };

    const handleAddChapter = () => {
        if (!selectedId) return;
        const nextIndex = chapters ? chapters.length : 0;
        createChapter.mutate({
            productId: selectedId,
            title: `Chapter ${nextIndex + 1}`,
            content: "",
            orderIndex: nextIndex
        }, {
            onSuccess: (newChapter) => {
                setActiveChapterId(newChapter.id);
                setContent("");
            }
        });
    };

    const createProduct = useCreateProduct();

    const handleCreateNewStory = () => {
        createProduct.mutate({
            writerId: user?.id,
            title: "رحلة غير معنونة",
            description: "قصة جديدة تبدأ...",
            content: "",
            type: "ebook",
            genre: "Fantasy",
            price: 50,
            isPublished: false,
            coverUrl: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400&h=600"
        }, {
            onSuccess: (newProduct) => {
                setLocation(`/studio/${newProduct.id}`);
                setViewMode('stories');
            }
        });
    };

    const handleCreateCollection = () => {
        createCollection.mutate({
            writer_id: user?.id,
            title: t("studio.collections.new") || "New Collection",
            is_published: false
        }, {
            onSuccess: (newColl) => {
                setLocation(`/studio/c-${newColl.id}`);
                setViewMode('collections');
            }
        });
    };

    const handleDeleteProduct = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm(t("studio.deleteConfirm"))) {
            deleteProduct.mutate(id, {
                onSuccess: () => {
                    if (selectedId === id) setLocation("/studio");
                }
            });
        }
    };

    const handleDeleteCollection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm(t("studio.deleteConfirm"))) {
            deleteCollection.mutate(id, {
                onSuccess: () => {
                    if (selectedCollectionId === id) setLocation("/studio");
                }
            });
        }
    };

    if (!user) return <Redirect to="/auth" />;

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-foreground font-sans selection:bg-primary/30 pt-16">
            <Navbar />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* Sidebar */}
                <aside className={cn(
                    "border-r border-white/5 bg-black/40 backdrop-blur-xl flex-col shrink-0",
                    selectedId || selectedCollectionId ? "hidden md:flex w-80" : "flex w-full md:w-80"
                )}>
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-serif font-bold text-gradient flex items-center gap-2">
                            <PenTool className="w-5 h-5" />
                            {t("studio.title")}
                        </h2>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-2">
                        {/* Mode Switch */}
                        <div className="flex p-1 bg-white/5 rounded-xl mb-6">
                            <button
                                onClick={() => setViewMode('stories')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                    viewMode === 'stories' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                                )}
                            >
                                <Library className="w-4 h-4" />
                                {t("studio.masterpieces")}
                            </button>
                            <button
                                onClick={() => setViewMode('collections')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                                    viewMode === 'collections' ? "bg-secondary text-white shadow-lg shadow-secondary/20" : "text-muted-foreground hover:text-white"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                {t("studio.collections.title")}
                            </button>
                        </div>

                        {viewMode === 'stories' ? (
                            <>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 mb-6 py-6"
                                    onClick={handleCreateNewStory}
                                    disabled={createProduct.isPending}
                                >
                                    {createProduct.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    {t("studio.createNew")}
                                </Button>

                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 opacity-50">
                                    {t("studio.masterpieces")}
                                </div>

                                <div className="mb-4 relative">
                                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder={t("studio.search") || "Search stories..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-white/5 border-white/10 pr-9 focus:ring-primary/20 h-10 text-sm"
                                    />
                                </div>

                                {productsLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                                ) : filteredProducts.length === 0 && searchQuery ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">لم يتم العثور على قصص.</div>
                                ) : filteredProducts.map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setLocation(`/studio/${p.id}`)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl transition-all group relative border",
                                            selectedId === p.id
                                                ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5"
                                                : "hover:bg-white/5 text-muted-foreground border-transparent"
                                        )}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-bold truncate flex-grow text-sm">{p.title}</div>
                                            <button onClick={(e) => handleDeleteProduct(e, p.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-[10px] opacity-50 flex items-center gap-2 mt-1">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", p.isPublished ? "bg-green-500" : "bg-amber-500")} />
                                            {p.isPublished ? t("studio.published_simple") : t("studio.draft_simple")} • {p.genre}
                                        </div>
                                    </button>
                                ))}
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 mb-6 py-6"
                                    onClick={handleCreateCollection}
                                    disabled={createCollection.isPending}
                                >
                                    {createCollection.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    {t("studio.collections.new")}
                                </Button>

                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 opacity-50">
                                    {t("studio.collections.list")}
                                </div>

                                <div className="mb-4 relative">
                                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder={t("studio.searchCollections") || "Search collections..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-white/5 border-white/10 pr-9 focus:ring-secondary/20 h-10 text-sm"
                                    />
                                </div>

                                {collectionsLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
                                ) : filteredCollections.length === 0 && searchQuery ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">لم يتم العثور على مجموعات.</div>
                                ) : filteredCollections.map((c: any) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setLocation(`/studio/c-${c.id}`)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl transition-all group relative border",
                                            selectedCollectionId === c.id
                                                ? "bg-secondary/10 border-secondary/30 text-secondary shadow-lg shadow-secondary/5"
                                                : "hover:bg-white/5 text-muted-foreground border-transparent"
                                        )}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="font-bold truncate flex-grow text-sm">{c.title}</div>
                                            <button onClick={(e) => handleDeleteCollection(e, c.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-[10px] opacity-50 flex items-center gap-2 mt-1">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", c.is_published ? "bg-green-500" : "bg-amber-500")} />
                                            {c.items?.length || 0} {t("home.collections.storiesCount")}
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5">
                        <Link href="/dashboard">
                            <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-white">
                                <ChevronLeft className="w-4 h-4" /> {t("studio.exit")}
                            </Button>
                        </Link>
                    </div>
                </aside>

                {/* Main View Area */}
                <main className={cn(
                    "flex-grow overflow-hidden relative bg-white/[0.01]",
                    !selectedId && !selectedCollectionId ? "hidden md:block" : "block"
                )}>
                    <AnimatePresence mode="wait">
                        {selectedCollectionId ? (
                            <CollectionEditor
                                key={`coll-${selectedCollectionId}`}
                                collId={selectedCollectionId}
                                allStories={products || []}
                            />
                        ) : selectedId ? (
                            <motion.div
                                key={`story-${selectedId}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col h-full"
                            >
                                {productLoading ? (
                                    <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>
                                ) : (
                                    <>
                                        <header className="border-b border-white/5 bg-black/20 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between">
                                            <div className="h-16 flex items-center justify-between px-4 md:px-8">
                                                <div className="flex items-center gap-2 md:gap-6">
                                                    <Button variant="ghost" size="icon" className="md:hidden shrink-0 -ml-2" onClick={() => setLocation('/studio')}>
                                                        <ChevronLeft className="w-6 h-6" />
                                                    </Button>
                                                    <div>
                                                        <h1 className="font-serif font-bold text-lg md:text-xl truncate max-w-[150px] md:max-w-xs">{currentProduct.title}</h1>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                                                            {currentProduct.isPublished ? t("studio.public") : t("studio.draft")}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 md:hidden">
                                                    <SaveButton
                                                        product={currentProduct}
                                                        content={content}
                                                        title={title}
                                                        description={description}
                                                        genre={genre}
                                                        price={price}
                                                        isSerialized={isSerialized}
                                                        seriesStatus={seriesStatus}
                                                        coverUrl={coverUrl}
                                                        appearanceSettings={appSettings}
                                                        activeChapterId={activeChapterId}
                                                        chapters={chapters}
                                                        iconOnly={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 px-4 pb-3 md:pb-0 md:px-8 md:h-16 overflow-x-auto no-scrollbar">
                                                <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full shrink-0">
                                                    <TabsList className="bg-transparent h-8 border-none p-0 flex">
                                                        <TabsTrigger value="write" className="rounded-full px-3 md:px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t("studio.tabs.write")}</TabsTrigger>
                                                        <TabsTrigger value="appearance" className="rounded-full px-3 md:px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t("studio.tabs.appearance")}</TabsTrigger>
                                                        <TabsTrigger value="market" className="rounded-full px-3 md:px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">{t("studio.tabs.market")}</TabsTrigger>
                                                    </TabsList>
                                                </Tabs>

                                                <div className="h-8 w-px bg-white/10 hidden md:block" />

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 rounded-full border-white/10 hover:bg-white/5 hidden md:flex"
                                                    onClick={() => setLocation(`/read/${selectedId}`)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {t("studio.preview")}
                                                </Button>

                                                <div className="hidden md:block">
                                                    <SaveButton
                                                        product={currentProduct}
                                                        content={content}
                                                        title={title}
                                                        description={description}
                                                        genre={genre}
                                                        price={price}
                                                        isSerialized={isSerialized}
                                                        seriesStatus={seriesStatus}
                                                        coverUrl={coverUrl}
                                                        appearanceSettings={appSettings}
                                                        activeChapterId={activeChapterId}
                                                        chapters={chapters}
                                                    />
                                                </div>
                                            </div>
                                        </header>

                                        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                                            {/* Story Editor Tabs Logic */}
                                            {activeTab === "write" && (
                                                <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
                                                    {/* Mobile Chapter Selector */}
                                                    <div className="md:hidden border-b border-white/5 bg-black/20 p-4 flex gap-2 shrink-0">
                                                        <div className="flex-grow relative">
                                                            <select
                                                                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold pl-4 pr-10 focus:ring-primary focus:border-primary"
                                                                value={activeChapterId || ''}
                                                                onChange={(e) => handleChapterSelect(Number(e.target.value))}
                                                            >
                                                                {chapters?.map((chapter) => (
                                                                    <option key={chapter.id} value={chapter.id} className="bg-background text-foreground">
                                                                        {chapter.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <Layers className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                        </div>
                                                        <Button size="icon" variant="outline" onClick={handleAddChapter} disabled={createChapter.isPending} className="shrink-0 aspect-square h-auto rounded-xl bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                                            {createChapter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                        </Button>
                                                    </div>

                                                    {/* Desktop Chapter Sidebar */}
                                                    <div className="w-64 border-r border-white/5 bg-black/20 flex-col shrink-0 hidden md:flex">
                                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                                            <h3 className="font-bold text-[10px] uppercase tracking-wider opacity-50">{t("studio.chapters")}</h3>
                                                            <Button size="sm" variant="ghost" onClick={handleAddChapter} disabled={createChapter.isPending} className="h-6 w-6 p-0 rounded-md">
                                                                <Plus className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="overflow-y-auto flex-grow p-2 space-y-1">
                                                            {chapters?.map((chapter) => (
                                                                <button
                                                                    key={chapter.id}
                                                                    onClick={() => handleChapterSelect(chapter.id)}
                                                                    className={cn(
                                                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group",
                                                                        activeChapterId === chapter.id
                                                                            ? "bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/5"
                                                                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                                                                    )}
                                                                >
                                                                    <span className="truncate">{chapter.title}</span>
                                                                    {activeChapterId === chapter.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex-grow overflow-y-auto p-4 md:p-12">
                                                        {activeChapterId && (
                                                            <div className="max-w-3xl mx-auto space-y-8">
                                                                <input
                                                                    className="bg-transparent border-none text-4xl font-serif font-bold w-full focus:outline-none placeholder:text-muted-foreground/20 text-gradient mb-8"
                                                                    value={chapters?.find((c: any) => c.id === activeChapterId)?.title || ""}
                                                                    onChange={(e) => updateChapter.mutate({ id: activeChapterId, title: e.target.value })}
                                                                    placeholder="فصل غير معنون"
                                                                />
                                                                <Textarea
                                                                    value={content}
                                                                    onChange={(e) => setContent(e.target.value)}
                                                                    placeholder={t("studio.placeholder")}
                                                                    className={cn(
                                                                        "flex-grow min-h-[60vh] text-xl leading-loose resize-none bg-transparent border-none focus-visible:ring-0 p-0 selection:bg-primary/30",
                                                                        appSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                                                                    )}
                                                                    style={{ fontSize: `${appSettings.fontSize}px`, lineHeight: appSettings.lineHeight }}
                                                                    dir="auto"
                                                                />
                                                                <div className="pt-8 border-t border-white/5 flex justify-between text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                                                                    <span>{t("studio.words")}: {content?.trim() ? content.split(/\s+/).length : 0}</span>
                                                                    <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-primary" /> {t("studio.autosave")}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === "appearance" && (
                                                <div className="flex-grow p-6 md:p-12 overflow-y-auto">
                                                    <div className="max-w-4xl mx-auto space-y-12">
                                                        <section>
                                                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-8">{t("studio.appearance.themes")}</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                                {['light', 'dark', 'fantasy'].map((theme) => (
                                                                    <button
                                                                        key={theme}
                                                                        onClick={() => setAppSettings({ ...appSettings, theme })}
                                                                        className={cn(
                                                                            "aspect-video rounded-2xl border-2 transition-all p-4 flex flex-col justify-between group overflow-hidden relative",
                                                                            appSettings.theme === theme ? "border-primary bg-primary/5 shadow-xl shadow-primary/10" : "border-white/5 bg-white/5 hover:border-white/20"
                                                                        )}
                                                                    >
                                                                        <div className="w-full h-8 rounded-lg bg-white/10" />
                                                                        <div className="space-y-2">
                                                                            <div className="w-2/3 h-1.5 rounded-full bg-white/10" />
                                                                            <div className="w-1/2 h-1.5 rounded-full bg-white/10" />
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{theme}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </section>

                                                        <section>
                                                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-8">{t("studio.appearance.typography")}</h3>
                                                            <div className="grid grid-cols-2 gap-12">
                                                                <div className="space-y-4">
                                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block">{t("studio.appearance.fontFamily")}</label>
                                                                    <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/5">
                                                                        {['serif', 'sans'].map((font) => (
                                                                            <button
                                                                                key={font}
                                                                                onClick={() => setAppSettings({ ...appSettings, fontFamily: font })}
                                                                                className={cn(
                                                                                    "flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                                                                                    appSettings.fontFamily === font ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white"
                                                                                )}
                                                                            >
                                                                                {t(`studio.appearance.${font}`)}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-6">
                                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">{t("studio.appearance.fontSize")} ({appSettings.fontSize}px)</label>
                                                                    <input
                                                                        type="range"
                                                                        min="12"
                                                                        max="32"
                                                                        value={appSettings.fontSize}
                                                                        onChange={(e) => setAppSettings({ ...appSettings, fontSize: parseInt(e.target.value) })}
                                                                        className="w-full accent-primary bg-white/10 rounded-lg h-1.5 cursor-pointer appearance-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </section>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === "market" && (
                                                <div className="flex-grow p-6 md:p-12 overflow-y-auto">
                                                    <div className="max-w-4xl mx-auto space-y-12 pb-24">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                                            <section className="space-y-8">
                                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{t("studio.market.identity")}</h3>
                                                                <div className="space-y-6">
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("studio.market.title")}</label>
                                                                        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-12 focus:ring-primary/20" />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("studio.market.genre")}</label>
                                                                        <Input value={genre} onChange={(e) => setGenre(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-12" />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("studio.market.description")}</label>
                                                                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] resize-none" dir="auto" />
                                                                    </div>
                                                                </div>
                                                            </section>

                                                            <section className="space-y-8">
                                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{t("studio.market.cover")}</h3>
                                                                <div className="aspect-[2/3] max-w-[280px] mx-auto rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                                                                    <CloudinaryUpload
                                                                        label={t("studio.market.coverLabel")}
                                                                        defaultImage={coverUrl || currentProduct.coverUrl}
                                                                        folder="hekayaty_covers"
                                                                        onUpload={(url) => setCoverUrl(url)}
                                                                    />
                                                                </div>
                                                            </section>
                                                        </div>

                                                        <section className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-8">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{t("studio.market.pricing")}</h3>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs font-bold text-muted-foreground">{t("studio.market.free_story")}</span>
                                                                    <UISwitch checked={isFree} onCheckedChange={(c) => { setIsFree(c); if (c) setPrice(0); }} />
                                                                </div>
                                                            </div>
                                                            {!isFree && (
                                                                <div className="max-w-xs">
                                                                    <Input type="number" value={price === 0 ? "" : price} onChange={(e) => setPrice(Number(e.target.value))} className="bg-black/40 border-primary/20 h-14 text-2xl font-bold" />
                                                                </div>
                                                            )}
                                                        </section>

                                                        <section className="pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center sm:justify-between gap-6">
                                                            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", currentProduct.isPublished ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500")}>
                                                                    {currentProduct.isPublished ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-lg">{currentProduct.isPublished ? t("studio.market.status.publicTitle") : t("studio.market.status.draftTitle")}</h4>
                                                                    <p className="text-xs text-muted-foreground">{currentProduct.isPublished ? t("studio.market.status.publicDesc") : t("studio.market.status.draftDesc")}</p>
                                                                </div>
                                                            </div>
                                                            <PublishToggle product={currentProduct} />
                                                        </section>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <div className="flex-grow flex items-center justify-center text-center p-12 h-full">
                                <div className="max-w-md space-y-6">
                                    <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto ring-1 ring-primary/20">
                                        <Book className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-3xl font-serif font-bold">{t("studio.selectStory")}</h2>
                                    <p className="text-muted-foreground opacity-60">{t("studio.selectDescription")}</p>
                                    <Link href="/dashboard">
                                        <Button variant="outline" className="px-8 rounded-full">{t("studio.returnDashboard")}</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

function SaveButton({ product, content, title, description, genre, price, isSerialized, seriesStatus, coverUrl, appearanceSettings, activeChapterId, chapters, iconOnly }: any) {
    const { t } = useTranslation();
    const updateProduct = useUpdateProduct();
    const updateChapter = useUpdateChapter();
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateProduct.mutateAsync({
                id: product.id,
                title,
                genre,
                price,
                isPublished: product.isPublished,
                isSerialized,
                seriesStatus,
                description,
                coverUrl,
                appearanceSettings
            });

            if (activeChapterId) {
                await updateChapter.mutateAsync({
                    id: activeChapterId,
                    content
                });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Button onClick={handleSave} disabled={saving} className={cn("bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20", iconOnly ? "w-10 h-10 p-0" : "gap-2 px-6")}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {!iconOnly && (saving ? t("common.saving") : t("studio.save"))}
        </Button>
    );
}

function PublishToggle({ product }: { product: any }) {
    const { t } = useTranslation();
    const updateProduct = useUpdateProduct();
    const isPublished = product.isPublished;

    return (
        <Button
            variant={isPublished ? "outline" : "default"}
            className={cn(
                "gap-2 rounded-full px-8 h-12 font-bold transition-all",
                isPublished ? "border-red-500/20 text-red-500 hover:bg-red-500/10" : "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
            )}
            onClick={() => updateProduct.mutate({ id: product.id, isPublished: !isPublished })}
            disabled={updateProduct.isPending}
        >
            {updateProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isPublished ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />)}
            {isPublished ? t("studio.market.offline") : t("studio.market.publish")}
        </Button>
    );
}
