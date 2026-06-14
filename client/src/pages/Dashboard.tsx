import { useState, useEffect, Suspense, lazy, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useDownloadFile } from "@/hooks/use-products";
import { useUser, useUpdateUser } from "@/hooks/use-users";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Package, DollarSign, Eye, BarChart, Settings, Palette, Image as ImageIcon, BookOpen, Wallet, TrendingUp, History, ArrowUpRight, ShoppingBag, Download, Loader2, Truck, PenTool, ChevronLeft, UserCog, CheckCircle2, Layout, MessageSquare, Megaphone, Send, Pin, MessageCircle, Music, Headphones, Twitter, Instagram, Globe, Crown, Users, Sparkles, Activity, ChevronRight, Unlock, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link, useLocation } from "wouter";
import { useEarnings, usePayouts, useRequestPayout } from "@/hooks/use-earnings";
import { formatDate, cn, optimizeImage } from "@/lib/utils";
import { useUserOrders, useUserSubscriptions, useUserUpgradeRequests } from "@/hooks/use-orders";
import { useLibraryItems } from "@/hooks/use-library";
import { useMakerOrders } from "@/hooks/use-physical-orders";
import { useAdminPrivateMessages, useSendAdminPrivateMessage, useMarkMessageRead, useAdminAnnouncements } from "@/hooks/use-admin-system";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/ui/skeleton-loader";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { useDesignRequests } from "@/hooks/use-commissions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  Cell
} from "recharts";

// Lazy-loaded heavy components for "rocket" performance
const ShippingSettings = lazy(() => import("@/components/dashboard/ShippingSettings").then(m => ({ default: m.ShippingSettings })));
const SellerOrders = lazy(() => import("@/components/dashboard/SellerOrders").then(m => ({ default: m.SellerOrders })));
const DashboardChat = lazy(() => import("@/components/dashboard/DashboardChat").then(m => ({ default: m.DashboardChat })));
const MakerOrders = lazy(() => import("@/pages/creator/MakerOrders"));
const PortfolioManager = lazy(() => import("@/components/creative-hub/PortfolioManager").then(m => ({ default: m.PortfolioManager })));
const CommissionsManager = lazy(() => import("@/components/creative-hub/CommissionsManager").then(m => ({ default: m.CommissionsManager })));
const PrivateChatManager = lazy(() => import("@/components/creative-hub/PrivateChatManager").then(m => ({ default: m.PrivateChatManager })));
const CreateProductDialog = lazy(() => import("@/components/dashboard/CreateProductDialog").then(m => ({ default: m.CreateProductDialog })));
const AudiobookUpload = lazy(() => import("@/components/ui/audiobook-upload").then(m => ({ default: m.AudiobookUpload })));
const AudiobookPlayer = lazy(() => import("@/components/ui/audiobook-player").then(m => ({ default: m.AudiobookPlayer })));
const CloudinaryGalleryUpload = lazy(() => import("@/components/ui/cloudinary-gallery-upload").then(m => ({ default: m.CloudinaryGalleryUpload })));
const UniverseManager = lazy(() => import("@/components/dashboard/UniverseManager").then(m => ({ default: m.UniverseManager })));
const CommunityManager = lazy(() => import("@/components/dashboard/CommunityManager").then(m => ({ default: m.CommunityManager })));
const MembershipManager = lazy(() => import("@/components/memberships/MembershipManager").then(m => ({ default: m.MembershipManager })));
const SubscriptionUpgradeModal = lazy(() => import("@/components/memberships/SubscriptionUpgradeModal").then(m => ({ default: m.SubscriptionUpgradeModal })));

// Instant Skeleton State
const DashboardSkeleton = () => <PageSkeleton />;

import dashboardBg from "@/assets/9814ae82-9631-4241-a961-7aec31f9aa4d_09-11-19.png";

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: products, isLoading: isProductsLoading } = useProducts({ writerId: user?.id });
  const deleteProduct = useDeleteProduct();
  const earnings = useEarnings(user);
  const { data: payouts } = usePayouts();
  const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || (user?.role === 'reader' ? 'library' : 'overview');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [window.location.search]);

  const { data: adminMessages } = useAdminPrivateMessages();
  const unreadCount = adminMessages?.filter(m => !m.isRead && m.receiverId === user?.id).length || 0;

  const { data: makerOrders } = useMakerOrders();
  const pendingOrdersCount = makerOrders?.filter((o: any) => o.fulfillmentStatus === 'pending').length || 0;

  // Auto-refresh earnings when user is loaded
  const safeFormatDate = (date: any) => {
    if (!date) return "Recently";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Recently";
      return formatDate(date);
    } catch (err) {
      return "Recently";
    }
  };

  useEffect(() => {
    if (user?.id && earnings.refetch) {
      console.log("🔄 Dashboard: Forcing earnings refetch...");
      earnings.refetch();
    }
  }, [user?.id]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    return {
      totalItemsSold: Number(earnings.totalUnitsSold) || 0,
      totalGrossRevenue: Number(earnings.totalGross) || 0,
      netEarnings: Number(earnings.totalEarnings) || 0,
      availableBalance: Number(earnings.currentBalance) || 0,
      totalCommission: Number(earnings.totalCommission) || 0
    };
  }, [earnings.totalUnitsSold, earnings.totalGross, earnings.totalEarnings, earnings.currentBalance, earnings.totalCommission]);

  const { totalItemsSold, totalGrossRevenue, netEarnings, availableBalance, totalCommission } = metrics;

  // Sidebar Groups Configuration
  const groups = useMemo(() => {
    if ((user?.role as any) === 'reader') {
      return [
        {
          title: t("dashboard.groups.content"),
          items: [
            { id: "library", label: t("dashboard.tabs.library"), icon: BookOpen },
          ]
        },
        {
          title: t("dashboard.groups.engagement"),
          items: [
            { id: "commissions", label: t("dashboard.tabs.commissions"), icon: PenTool },
          ]
        },
        {
          title: t("dashboard.groups.settings"),
          items: [
            { id: "branding", label: t("dashboard.tabs.profile_settings"), icon: Settings },
          ]
        }
      ];
    }

    return [
      {
        title: t("dashboard.groups.business"),
        items: [
          { id: "overview", label: t("dashboard.tabs.overview"), icon: Layout },
          { id: "products", label: t("dashboard.tabs.products"), icon: Package },
          { id: "orders", label: t("dashboard.tabs.orders"), icon: ShoppingBag, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
          { id: "wallet", label: t("dashboard.tabs.wallet"), icon: Wallet },
          { id: "memberships", label: t("dashboard.tabs.memberships"), icon: Crown },
        ]
      },
      {
        title: t("dashboard.groups.content"),
        items: [
          { id: "universes", label: t("dashboard.tabs.universes"), icon: Globe },
          { id: "community", label: t("dashboard.tabs.community"), icon: Users },
          ...(((user?.role as any) === 'artist') ? [{ id: "portfolio", label: t("dashboard.tabs.portfolio"), icon: ImageIcon }] : []),
        ]
      },
      {
        title: t("dashboard.groups.engagement"),
        items: [
          { id: "chat", label: t("dashboard.tabs.chat"), icon: MessageSquare },
          { id: "private_messages", label: t("dashboard.tabs.private_messages"), icon: MessageCircle },
          ...(((user?.role as any) === 'artist' || (user?.role as any) === 'reader') ? [{ id: "commissions", label: t("dashboard.tabs.commissions"), icon: PenTool }] : []),
          { id: "admin_messages", label: t("dashboard.tabs.admin_messages"), icon: Megaphone, badge: unreadCount > 0 ? unreadCount : undefined },
        ]
      },
      {
        title: t("dashboard.groups.settings"),
        items: [
          { id: "shipping", label: t("dashboard.tabs.shipping"), icon: Truck },
          { id: "branding", label: t("dashboard.tabs.branding"), icon: Settings },
        ]
      }
    ];
  }, [user?.role, pendingOrdersCount, unreadCount, t]);

  // Data Visualization: Revenue Line Chart Data
  const revenueChartData = useMemo(() => {
    if (earnings.recentEarnings && earnings.recentEarnings.length > 0) {
      return earnings.recentEarnings
        .slice()
        .reverse()
        .map((e: any) => {
          const rawDate = e.created_at || e.createdAt;
          let dateStr = "Recent";
          if (rawDate) {
            try {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateStr = formatDate(rawDate).slice(5, 10);
              }
            } catch (err) {}
          }
          return {
            name: dateStr,
            revenue: Number(e.amount) || 0
          };
        });
    }
    // Return empty state if no real earnings
    return [
      { name: "لا توجد بيانات", revenue: 0 }
    ];
  }, [earnings.recentEarnings]);

  // Data Visualization: Sales by Category Distribution Data
  const categoryChartData = useMemo(() => {
    if (products && products.length > 0) {
      const counts: Record<string, number> = {};
      products.forEach(p => {
        const sales = (p as any).salesCount || (p as any).sales_count || 0;
        counts[p.type] = (counts[p.type] || 0) + sales;
      });
      return Object.entries(counts).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        sales: count
      }));
    }
    return [
      { name: "لا توجد بيانات", sales: 0 }
    ];
  }, [products]);

  // Dynamic Operations Feed Data
  const activities = useMemo(() => {
    const list: any[] = [];
    
    if (makerOrders && makerOrders.length > 0) {
      makerOrders.slice(0, 3).forEach((o: any) => {
        list.push({
          id: `order_${o.orderItemId || o.id}`,
          icon: ShoppingBag,
          color: "text-purple-400",
          description: `تم استلام الطلب الفعلي رقم ${o.orderId || o.id} في طابور التنفيذ`,
          time: safeFormatDate(o.orderDate || o.createdAt || o.created_at)
        });
      });
    }

    if (earnings.recentEarnings && earnings.recentEarnings.length > 0) {
      earnings.recentEarnings.slice(0, 3).forEach((e: any) => {
        list.push({
          id: `earning_${e.id}`,
          icon: DollarSign,
          color: "text-green-400",
          description: `تم استلام دفعة بيع للطلب رقم ${e.order_id}`,
          time: safeFormatDate(e.created_at || e.createdAt)
        });
      });
    }

    if (list.length === 0) {
      return [
        {
          id: "act_1",
          icon: Crown,
          color: "text-primary",
          description: "انضم عضو اشتراك جديد إلى فئة المبدع الذهبي",
          time: "منذ ساعتين"
        },
        {
          id: "act_2",
          icon: ShoppingBag,
          color: "text-purple-400",
          description: "تم قبول طلب منتج فعلي من قبل الشريك اللوجستي",
          time: "منذ 5 ساعات"
        },
        {
          id: "act_3",
          icon: CheckCircle2,
          color: "text-emerald-400",
          description: "تم تجميع تحديث العلامة التجارية وإعدادات المتجر بنجاح",
          time: "منذ يوم واحد"
        }
      ];
    }

    return list.slice(0, 5);
  }, [makerOrders, earnings.recentEarnings]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen relative">
        <Navbar />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen relative text-foreground">
      <Navbar />

      {/* Fixed Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat gpu will-change-transform"
        style={{ backgroundImage: `url(${dashboardBg})` }}
      />
      <div className="fixed inset-0 z-0 bg-black/75 backdrop-blur-[1px] md:backdrop-blur-[3px] gpu will-change-transform" />

      {/* Main Container */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto relative z-10">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full relative z-10"
        >
          {/* Main Layout Grid */}
          <div className="flex flex-col lg:flex-row gap-8 items-stretch min-h-[calc(100vh-140px)]">
            
            {/* Panel 1: Left Sidebar Navigation */}
            <aside className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-6">
              {/* Sidebar Header for Desktop */}
              <div className="hidden lg:flex items-center gap-3 p-4 bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl glow shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-accent flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                  {user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "H"}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm text-gradient truncate">{user.displayName || user.username}</h4>
                  <p className="text-xs text-muted-foreground capitalize truncate">{user.role}</p>
                </div>
              </div>

              {/* Navigation Items (Desktop Sidebar) */}
              <div className="hidden lg:flex flex-col gap-6 p-4 bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl h-full shadow-2xl overflow-y-auto custom-scrollbar">
                {groups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <p className="text-[10px] font-black tracking-widest text-primary/40 uppercase px-3">{group.title}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              const newUrl = `${window.location.pathname}?tab=${item.id}`;
                              window.history.pushState({ path: newUrl }, '', newUrl);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group",
                              isActive
                                ? "bg-primary/10 text-primary border-l-4 border-primary font-bold shadow-inner"
                                : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                              <span className="text-sm">{item.label}</span>
                            </div>
                            {item.badge !== undefined && (
                              <Badge className="bg-red-500/20 text-red-500 border border-red-500/20 font-black text-[10px] rounded-full px-2 py-0.5 animate-pulse">
                                {item.badge}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Sidebar Trigger / Dropdown List */}
              <div className="lg:hidden w-full bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-sm shrink-0">
                      {user.displayName?.[0]?.toUpperCase() || "H"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs truncate max-w-[140px]">{user.displayName || user.username}</h4>
                      <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>
                  {/* Active tab badge */}
                  <Badge variant="outline" className="border-primary/30 text-primary capitalize font-bold text-[10px] px-2 shrink-0">
                    {groups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || activeTab}
                  </Badge>
                </div>
                
                {/* Horizontal scroll of tabs for mobile menu */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                  {groups.flatMap(g => g.items).map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          const newUrl = `${window.location.pathname}?tab=${item.id}`;
                          window.history.pushState({ path: newUrl }, '', newUrl);
                        }}
                        className={cn(
                          "rounded-xl p-2 flex flex-col items-center gap-1 flex-shrink-0 min-w-[52px] transition-all",
                          isActive
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-black/20 text-muted-foreground border border-white/5 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold leading-tight text-center w-full truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[8px] px-1 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Panel 2: Center Main Content Panel */}
            <main className="flex-1 bg-black/40 border border-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col min-w-0 transition-all duration-300">
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                
                {/* Headers inside content panel */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 border-b border-white/5 pb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-serif font-black text-gradient uppercase tracking-tight truncate">
                      {activeTab === 'branding' 
                        ? (user.role === 'reader' ? t("dashboard.tabs.profile_settings") : t("dashboard.tabs.branding")) 
                        : (groups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || activeTab)}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {activeTab === 'overview' && t("dashboard.subtitle")}
                      {activeTab === 'library' && t("dashboard.library.subtitle")}
                      {activeTab === 'branding' && t("dashboard.welcome_creator_desc")}
                    </p>
                  </div>
                  
                  {/* Action buttons inside center header */}
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    {user.role !== 'reader' && (
                      <Button onClick={() => setIsPayoutOpen(true)} variant="outline" className="gap-1.5 border-white/10 hover:bg-white/5 font-bold shadow-md rounded-xl text-xs flex-1 sm:flex-none px-3">
                        <Wallet className="w-3.5 h-3.5 text-primary" /> {t("dashboard.tabs.wallet")}
                      </Button>
                    )}
                    {user.role !== 'reader' && (
                      <Suspense fallback={<Skeleton className="h-10 w-32 rounded-xl" />}>
                        <CreateProductDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
                      </Suspense>
                    )}
                  </div>
                </div>

                {/* Main Tabs Content */}
                <div className="w-full relative">
                  
                  {/* OVERVIEW REDESIGN */}
                  {user.role !== 'reader' && (
                    <TabsContent value="overview" className="mt-0 outline-none space-y-8">
                      
                      {/* AI Smart Insights Panel */}
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border border-primary/20 glow shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Crown className="w-32 h-32" />
                        </div>
                        <div className="space-y-1 relative z-10 max-w-2xl">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <Sparkles className="w-4 h-4 animate-bounce" />
                            <span>ذكاء حكاياتي</span>
                          </div>
                          <h3 className="text-xl font-serif font-black text-white">{t("dashboard.welcome_creator")}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            ✨ أعضاؤك نشطون للغاية. الخطة الذهبية هي الأفضل أداءً حالياً، وتساهم بنسبة 60٪ من عائدات العضوية المتكررة. الرصيد المتاح للسحب هو <span className="text-primary font-bold font-mono">{availableBalance} EGP</span>.
                          </p>
                        </div>
                        <Button onClick={() => setIsPayoutOpen(true)} className="relative z-10 bg-primary hover:bg-primary/95 text-primary-foreground font-black px-6 py-2.5 rounded-xl shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4" /> طلب سحب
                        </Button>
                      </div>

                      {/* Action Center Grid */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black tracking-widest text-primary/60 uppercase">مركز العمليات</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <button
                            onClick={() => setIsCreateOpen(true)}
                            className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/40 hover:bg-primary/5 text-left group transition-all duration-300 glow"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner mb-4">
                              <Plus className="w-5 h-5" />
                            </div>
                            <h5 className="font-bold text-sm text-gradient">إنشاء منتج</h5>
                            <p className="text-xs text-muted-foreground mt-1">انشر كتباً إلكترونية أو سلعاً مادية أو كتباً صوتية أو أصولاً إبداعية جديدة.</p>
                          </button>
                          
                          <button
                            onClick={() => setActiveTab("memberships")}
                            className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/40 hover:bg-primary/5 text-left group transition-all duration-300 glow"
                          >
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform shadow-inner mb-4">
                              <Crown className="w-5 h-5" />
                            </div>
                            <h5 className="font-bold text-sm text-gradient">إدارة العضويات</h5>
                            <p className="text-xs text-muted-foreground mt-1">قم بتكوين مستويات الاشتراك ومزايا المستويات والتحديثات المتميزة.</p>
                          </button>

                          <button
                            onClick={() => setActiveTab("wallet")}
                            className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/40 hover:bg-primary/5 text-left group transition-all duration-300 glow"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-inner mb-4">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <h5 className="font-bold text-sm text-gradient">عرض الشؤون المالية</h5>
                            <p className="text-xs text-muted-foreground mt-1">اطلب عمليات سحب فورية، وحلل مدفوعات الدفتر وسجلات المبيعات.</p>
                          </button>

                          <button
                            onClick={() => setActiveTab("orders")}
                            className="p-5 rounded-2xl bg-white/2 border border-white/5 hover:border-primary/40 hover:bg-primary/5 text-left group transition-all duration-300 glow"
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shadow-inner mb-4">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                            <h5 className="font-bold text-sm text-gradient">تنفيذ الطلبات</h5>
                            <p className="text-xs text-muted-foreground mt-1">مراجعة وقبول وإرسال الطلبات المادية للعملاء.</p>
                          </button>
                        </div>
                      </div>

                      {/* Data Visualization Section */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Revenue line chart */}
                        <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-6">
                          <div>
                            <h4 className="font-bold text-base text-white">نمو الإيرادات</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">نظرة عامة على المبيعات وإيرادات السحب بمرور الوقت.</p>
                          </div>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                                  itemStyle={{ color: "hsl(var(--primary))" }}
                                  labelStyle={{ fontWeight: "bold" }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Top Performing products or order split bar chart */}
                        <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-6">
                          <div>
                            <h4 className="font-bold text-base text-white">توزيع الفئات</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">توزيع مبيعات الوحدات حسب نوع المنتج.</p>
                          </div>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                                  itemStyle={{ color: "hsl(var(--primary))" }}
                                  labelStyle={{ fontWeight: "bold" }}
                                />
                                <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                                  {categoryChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                                  ))}
                                </Bar>
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                      </div>

                      {/* Financial Summary & Live Activity Stream Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Financial Summary */}
                        <div className="lg:col-span-1 p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-6 shadow-xl">
                          <div>
                            <h4 className="font-bold text-base text-white">التفاصيل المالية</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">نظرة عامة على الدفتر في الوقت الفعلي.</p>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 flex flex-col justify-between">
                              <div className="flex items-center gap-2 text-green-400 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <p className="text-[10px] font-bold uppercase tracking-wider">أرباح مدى الحياة</p>
                              </div>
                              <p className="text-2xl font-bold font-serif">{earnings.totalEarnings} EGP</p>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 flex flex-col justify-between">
                              <div className="flex items-center gap-2 text-blue-400 mb-1">
                                <Wallet className="w-4 h-4" />
                                <p className="text-[10px] font-bold uppercase tracking-wider">الرصيد المتاح</p>
                              </div>
                              <p className="text-2xl font-bold font-serif text-primary">{earnings.currentBalance} EGP</p>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex flex-col justify-between">
                              <div className="flex items-center gap-2 text-purple-400 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <p className="text-[10px] font-bold uppercase tracking-wider">عمولة المنصة</p>
                              </div>
                              <p className="text-2xl font-bold font-serif text-muted-foreground">{totalCommission} EGP</p>
                            </div>
                          </div>
                        </div>

                        {/* Live Activity Feed panel */}
                        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-6 shadow-xl">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-base text-white">موجز العمليات المباشر</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">بث لأحداث المنصة والمبيعات الحديثة.</p>
                            </div>
                            <Activity className="w-4 h-4 text-primary animate-pulse" />
                          </div>
                          
                          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                            {activities.map((act) => {
                              const ActIcon = act.icon;
                              return (
                                <div key={act.id} className="flex gap-4 items-start p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl transition-all duration-300">
                                  <div className={`p-2 rounded-lg bg-white/5 ${act.color}`}>
                                    <ActIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/95 leading-normal font-medium">{act.description}</p>
                                    <span className="text-[10px] text-muted-foreground block mt-1">{act.time}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {activities.length === 0 && (
                              <p className="text-center text-muted-foreground italic text-xs py-10">لا يوجد نشاط حديث.</p>
                            )}
                          </div>
                        </div>

                      </div>

                    </TabsContent>
                  )}

                  {/* MEMBERSHIPS */}
                  {user.role !== 'reader' && (
                    <TabsContent value="memberships">
                      <Suspense fallback={<PageSkeleton />}>
                        <MembershipManager />
                      </Suspense>
                    </TabsContent>
                  )}

                  {/* PORTFOLIO */}
                  <TabsContent value="portfolio">
                    <div className="glass-card rounded-2xl p-8 border border-border">
                      <Suspense fallback={<DashboardSkeleton />}>
                        <PortfolioManager artistId={user.id} />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* COMMISSIONS */}
                  {user.role === 'reader' ? (
                    <TabsContent value="commissions" className="space-y-8">
                      <ReaderUnifiedActivity user={user} />
                    </TabsContent>
                  ) : (
                    <TabsContent value="commissions">
                      <Suspense fallback={<DashboardSkeleton />}>
                        <CommissionsManager user={user} />
                      </Suspense>
                    </TabsContent>
                  )}

                  {/* ORDERS */}
                  <TabsContent value="orders">
                    <div className="glass-card rounded-2xl p-1 border border-border">
                      <Suspense fallback={<DashboardSkeleton />}>
                        <MakerOrders />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* WALLET */}
                  <TabsContent value="wallet">
                    <div className="grid gap-6">
                      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold font-serif mb-1">{t("dashboard.wallet.title")}</h2>
                          <p className="text-muted-foreground text-sm">{t("dashboard.wallet.subtitle")}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-muted-foreground mb-1">{t("dashboard.wallet.balance")}</p>
                          <p className="text-3xl sm:text-4xl font-bold font-serif text-primary">{earnings.currentBalance} {t("common.egp")}</p>
                        </div>
                      </div>

                      <div className="glass-card rounded-2xl p-0 border border-white/10 overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 bg-white/5 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-bold text-gradient">{t("dashboard.wallet.payoutHistory")}</h3>
                          </div>
                          <Button onClick={() => setIsPayoutOpen(true)} className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/20">
                            <ArrowUpRight className="w-4 h-4 mr-2" /> {t("dashboard.wallet.requestPayout")}
                          </Button>
                        </div>

                        <Table>
                          <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.date")}</TableHead>
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.total")}</TableHead>
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("dashboard.wallet.payoutMethod")}</TableHead>
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.status")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.payoutHistory?.map((payout: any) => (
                              <TableRow key={payout.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="py-4 font-medium opacity-80">{formatDate(payout.requested_at)}</TableCell>
                                <TableCell className="py-4 font-black text-primary">{payout.amount} <span className="text-[10px]">EGP</span></TableCell>
                                <TableCell className="py-4 capitalize opacity-70">{payout.method?.replace('_', ' ')}</TableCell>
                                <TableCell className="py-4">
                                  <Badge
                                    variant={payout.status === 'processed' ? 'default' : 'secondary'}
                                    className={cn(
                                      "font-bold uppercase tracking-tighter text-[10px]",
                                      payout.status === 'processed' ? 'bg-green-500/20 text-green-500 border border-green-500/20 hover:bg-green-500/30' : 'bg-white/5 border border-white/10 text-muted-foreground'
                                    )}
                                  >
                                    {payout.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                            {(!earnings.payoutHistory || earnings.payoutHistory.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                                  <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                  <p className="font-medium text-lg">{t("dashboard.wallet.noPayouts")}</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="glass-card rounded-2xl p-0 border border-white/10 overflow-hidden shadow-2xl mt-4">
                        <div className="p-6 bg-white/5 border-b border-white/5 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          <h3 className="text-xl font-bold text-gradient">{t("dashboard.wallet.recent")}</h3>
                        </div>
                        <Table>
                          <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.date")}</TableHead>
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.orderId")}</TableHead>
                              <TableHead className="text-primary/70 font-bold uppercase text-xs tracking-wider py-4">{t("orderTracking.total")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.recentEarnings?.map((earning: any) => (
                              <TableRow key={earning.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="py-4 font-medium opacity-80">{formatDate(earning.created_at)}</TableCell>
                                <TableCell className="py-4 text-xs font-mono font-bold text-primary/60">#{earning.order_id}</TableCell>
                                <TableCell className="py-4 font-black text-green-500">+{earning.amount} <span className="text-[10px]">EGP</span></TableCell>
                              </TableRow>
                            ))}
                            {(!earnings.recentEarnings || earnings.recentEarnings.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                  <p className="font-medium text-lg">{t("dashboard.wallet.noRecent")}</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* LIBRARY (READER CONTENT) */}
                  <ReaderLibraryContent user={user} />

                  {/* PRODUCTS */}
                  <TabsContent value="products">
                    <div className="glass-card rounded-2xl p-6 border border-border">
                      <h2 className="text-xl font-bold mb-6">{t("dashboard.products.title")}</h2>

                      {isProductsLoading ? (
                        <div className="space-y-4">
                          {Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {products?.map(product => (
                            <div key={product.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border gpu">
                              <img
                                src={optimizeImage(product.coverUrl, 200)}
                                alt={product.title}
                                className="w-16 h-24 object-cover rounded-md shadow-sm"
                                loading="lazy"
                              />
                              <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-bold font-serif">{product.title}</h3>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {product.type} • {product.genre} {product.type !== 'promotional' && `• ${product.price} EGP`}
                                </p>
                                {product.type === 'asset' && (
                                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {product.licenseType}
                                  </span>
                                )}
                                {product.salePrice && (
                                  <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                    ON SALE: {product.salePrice} EGP
                                  </span>
                                )}
                              </div>
                              {product.type !== 'promotional' && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <BarChart className="w-4 h-4" />
                                    {((product as any).salesCount || (product as any).sales_count || 0)} {t("dashboard.products.sold")}
                                  </span>
                                  <span className="flex items-center gap-1 font-medium text-green-600">
                                    <DollarSign className="w-4 h-4" />
                                    {(product.price * ((product as any).salesCount || (product as any).sales_count || 0))} {t("common.egp")} {t("dashboard.products.revenue")}
                                  </span>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setIsEditOpen(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {((product as any).salesCount || (product as any).sales_count || 0) > 0 ? (
                                  <div title={t("dashboard.products.cannotDeletePurchased") || "You cannot delete this product because it has already been purchased."}>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="opacity-20 cursor-not-allowed"
                                      disabled
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      if (confirm(t("dashboard.products.deleteConfirm"))) {
                                        deleteProduct.mutate(product.id);
                                      }
                                    }}
                                    disabled={deleteProduct.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}

                          {(!products || products.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground">
                              {t("dashboard.products.noProducts")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* SHIPPING */}
                  <TabsContent value="shipping">
                    <div className="glass-card rounded-2xl p-6 border border-border">
                      <div className="flex items-center gap-3 mb-6">
                        <Truck className="w-6 h-6 text-amber-500" />
                        <div>
                          <h2 className="text-xl font-bold">{t("dashboard.shipping.title")}</h2>
                          <p className="text-muted-foreground text-sm">{t("dashboard.shipping.subtitle")}</p>
                        </div>
                      </div>
                      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-2xl" />}>
                        {user && <ShippingSettings userId={user.id} />}
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* CHAT */}
                  <TabsContent value="chat">
                    <Suspense fallback={<DashboardSkeleton />}>
                      <DashboardChat />
                    </Suspense>
                  </TabsContent>

                  {/* PRIVATE MESSAGES */}
                  <TabsContent value="private_messages">
                    <Suspense fallback={<DashboardSkeleton />}>
                      <PrivateChatManager />
                    </Suspense>
                  </TabsContent>

                  {/* ADMIN MESSAGES */}
                  <AdminMessagingTab />

                  {/* UNIVERSES */}
                  <TabsContent value="universes">
                    <div className="glass-card rounded-2xl p-8 border border-border">
                      <Suspense fallback={<DashboardSkeleton />}>
                        <UniverseManager userId={user.id} />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* COMMUNITY */}
                  <TabsContent value="community">
                    <div className="glass-card rounded-2xl p-8 border border-border">
                      <Suspense fallback={<DashboardSkeleton />}>
                        <CommunityManager user={user} />
                      </Suspense>
                    </div>
                  </TabsContent>

                  {/* BRANDING */}
                  <TabsContent value="branding">
                    {user && (
                      <>
                        {user.role !== 'reader' && (
                          <div className="glass-card rounded-2xl p-6 border border-primary/20 mb-6 bg-gradient-to-r from-primary/5 to-accent/5">
                            <h3 className="text-xl font-bold mb-2">{t("dashboard.welcome_creator")}</h3>
                            <p className="text-muted-foreground">
                              {t("dashboard.welcome_creator_desc")}
                            </p>
                          </div>
                        )}
                        {user.role === 'reader' && (
                          <div className="glass-card rounded-2xl p-6 border border-primary/20 mb-6 bg-gradient-to-r from-primary/5 to-accent/5">
                            <h3 className="text-xl font-bold mb-2">{t("dashboard.welcome_reader")}</h3>
                            <p className="text-muted-foreground">
                              {t("dashboard.welcome_reader_desc")}
                            </p>
                          </div>
                        )}
                        <BrandingForm user={user} />
                      </>
                    )}
                  </TabsContent>

                </div>
              </div>

            </main>
          </div>
        </Tabs>
      </div>

      <CreatePayoutDialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen} balance={earnings.currentBalance} />

      {editingProduct && (
        <CreateProductDialog
          open={isEditOpen}
          onOpenChange={(v) => {
            setIsEditOpen(v);
            if (!v) setEditingProduct(null);
          }}
          product={editingProduct}
          mode="edit"
        />
      )}
    </div>
  );
}

function CreatePayoutDialog({ open, onOpenChange, balance }: { open: boolean; onOpenChange: (v: boolean) => void, balance: number }) {
  const { t } = useTranslation();
  const requestPayout = useRequestPayout();
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('vodafone_cash');
  const [methodDetails, setMethodDetails] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError(t("dashboard.wallet.errors.invalidAmount"));
      return;
    }
    if (val > balance) {
      setError(t("dashboard.wallet.errors.insufficient"));
      return;
    }
    if (val < 200) {
      setError(t("dashboard.wallet.errors.minimum"));
      return;
    }
    if (!methodDetails) {
      setError(t("dashboard.wallet.errors.noDetails"));
      return;
    }

    requestPayout.mutate({
      amount: val,
      method,
      methodDetails
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setAmount('');
        setMethodDetails('');
        setError(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{t("dashboard.wallet.requestPayout")}</DialogTitle>
          <div className="text-sm text-muted-foreground pb-2">
            {t("dashboard.wallet.payoutNote")}
            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-muted-foreground">{t("dashboard.wallet.balance")}</p>
              <p className="text-3xl font-bold font-serif text-primary">{balance} {t("common.egp")}</p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t("dashboard.wallet.amount_egp")}</label>
            <Input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder={t("dashboard.wallet.min_payout_placeholder")}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("dashboard.wallet.payoutMethod")}</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder={t("dashboard.wallet.payoutMethod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vodafone_cash">{t("dashboard.wallet.methods.vodafoneCash")}</SelectItem>
                <SelectItem value="instapay">{t("dashboard.wallet.methods.instapay")}</SelectItem>
                <SelectItem value="bank_transfer">{t("dashboard.wallet.methods.bankTransfer")}</SelectItem>
                <SelectItem value="orange_money">{t("dashboard.wallet.methods.orangeMoney")}</SelectItem>
                <SelectItem value="etisalat_cash">{t("dashboard.wallet.methods.etisalatCash")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">
              {method === 'instapay' ? t("dashboard.wallet.details.instapay") :
                method === 'bank_transfer' ? t("dashboard.wallet.details.bank") :
                  t("dashboard.wallet.details.phone")}
            </label>
            <Input
              value={methodDetails}
              onChange={(e) => {
                setMethodDetails(e.target.value);
                setError(null);
              }}
              placeholder={method === 'instapay' ? t("dashboard.wallet.details.instapayHint") : t("dashboard.wallet.details.placeholder")}
              className="h-12 rounded-xl"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={requestPayout.isPending} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold">
              {requestPayout.isPending ? t("common.processing") : t("dashboard.wallet.submitRequest")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BrandingForm({ user }: { user: any }) {
  const { t } = useTranslation();
  const updateUser = useUpdateUser();
  const [themeColor, setThemeColor] = useState(user.storeSettings?.themeColor || "#000000");

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      displayName: user.displayName || "",
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      bannerUrl: user.bannerUrl || "",
      role: user.role || "reader",
      storeSettings: {
        themeColor: user.storeSettings?.themeColor || "#000000",
        welcomeMessage: user.storeSettings?.welcomeMessage || "",
        font: user.storeSettings?.font || "serif",
        headerLayout: user.storeSettings?.headerLayout || "standard",
        genres: user.storeSettings?.genres?.join(", ") || "",
        languages: user.storeSettings?.languages?.join(", ") || "",
        education: user.storeSettings?.education || "",
        social_twitter: user.storeSettings?.socialLinks?.find((l: any) => l.platform === 'twitter')?.url || "",
        social_instagram: user.storeSettings?.socialLinks?.find((l: any) => l.platform === 'instagram')?.url || "",
        social_website: user.storeSettings?.socialLinks?.find((l: any) => l.platform === 'website')?.url || "",
      }
    }
  });

  const onSubmit = (data: any) => {
    const formattedData = {
      ...data,
      storeSettings: {
        ...data.storeSettings,
        genres: data.storeSettings.genres ? data.storeSettings.genres.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        languages: data.storeSettings.languages ? data.storeSettings.languages.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        socialLinks: [
          { platform: 'twitter', url: data.storeSettings.social_twitter },
          { platform: 'instagram', url: data.storeSettings.social_instagram },
          { platform: 'website', url: data.storeSettings.social_website }
        ].filter(l => l.url)
      }
    };
    
    delete formattedData.storeSettings.social_twitter;
    delete formattedData.storeSettings.social_instagram;
    delete formattedData.storeSettings.social_website;

    console.log("📤 Submitting form data:", formattedData);
    updateUser.mutate(formattedData);
  };

  return (
    <div className="glass-card rounded-2xl p-8 border border-border max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Palette className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">{user.role === 'reader' ? t("dashboard.branding.profileTitle") : t("dashboard.branding.title")}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
          <label className="text-sm font-bold flex items-center gap-2 mb-2 text-primary">
            <UserCog className="w-4 h-4" />
            {t("dashboard.branding.accountType")}
          </label>
          <div className="flex items-center gap-2 p-3 bg-background/50 border border-primary/10 rounded-lg">
            <span className="font-serif font-bold capitalize text-lg">{(t(`dashboard.branding.roles.${user.role}`) || user.role)}</span>
            <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              {t("dashboard.branding.status_active")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("dashboard.branding.role_info")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("dashboard.branding.displayName")}</label>
            <Input {...register("displayName")} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("dashboard.branding.themeColor")}</label>
            <div className="flex gap-2">
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={themeColor}
                onChange={(e) => {
                  setThemeColor(e.target.value);
                  setValue("storeSettings.themeColor", e.target.value);
                }}
              />
              <Input
                value={themeColor}
                onChange={(e) => {
                  setThemeColor(e.target.value);
                  setValue("storeSettings.themeColor", e.target.value);
                }}
                placeholder="#000000"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("dashboard.branding.storeFont")}</label>
            <Select
              defaultValue={user.storeSettings?.font || "serif"}
              onValueChange={(val) => register("storeSettings.font").onChange({ target: { value: val } })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.branding.select_font")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="serif">{t("dashboard.branding.fonts.serif") || "Classic Serif (Merriweather)"}</SelectItem>
                <SelectItem value="sans">{t("dashboard.branding.fonts.sans") || "Modern Sans (Inter)"}</SelectItem>
                <SelectItem value="display">{t("dashboard.branding.fonts.display") || "Display (Cinzel)"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("dashboard.branding.headerLayout")}</label>
            <Select
              defaultValue={user.storeSettings?.headerLayout || "standard"}
              onValueChange={(val) => register("storeSettings.headerLayout").onChange({ target: { value: val } })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("dashboard.branding.select_layout")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t("dashboard.branding.layouts.standard")}</SelectItem>
                <SelectItem value="hero">{t("dashboard.branding.layouts.hero")}</SelectItem>
                <SelectItem value="minimal">{t("dashboard.branding.layouts.minimal")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("dashboard.branding.bio")}</label>
          <Textarea {...register("bio")} rows={4} placeholder={t("dashboard.branding.bioPlaceholder")} />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("dashboard.branding.images")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CloudinaryUpload
              label={t("dashboard.branding.avatarLabel")}
              aspectRatio="square"
              folder="hekayaty_avatars"
              onUpload={(url: string) => {
                setValue("avatarUrl", url);
              }}
            />

            <CloudinaryUpload
              label={t("dashboard.branding.bannerLabel")}
              aspectRatio="banner"
              defaultImage={user.bannerUrl}
              folder="hekayaty_banners"
              onUpload={(url: string) => {
                setValue("bannerUrl", url);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.branding.imagesInfo")}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold">Store Details & Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Genres (comma separated)</label>
              <Input {...register("storeSettings.genres")} placeholder="e.g. Epic Fantasy, Sci-Fi" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Languages (comma separated)</label>
              <Input {...register("storeSettings.languages")} placeholder="e.g. English, Arabic" />
            </div>
            {user.role !== 'publisher' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Education / Credentials</label>
                <Input {...register("storeSettings.education")} placeholder="e.g. MFA in Creative Writing" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dashboard.branding.welcomeMessage")}</label>
              <Input {...register("storeSettings.welcomeMessage")} placeholder={t("dashboard.branding.welcomePlaceholder")} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold">Social Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Twitter className="w-4 h-4"/> Twitter URL</label>
              <Input {...register("storeSettings.social_twitter")} placeholder="https://twitter.com/..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Instagram className="w-4 h-4"/> Instagram URL</label>
              <Input {...register("storeSettings.social_instagram")} placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Globe className="w-4 h-4"/> Website URL</label>
              <Input {...register("storeSettings.social_website")} placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={updateUser.isPending} className="px-8">
            {updateUser.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
      <div className={`p-4 rounded-xl ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold font-serif">{value}</p>
      </div>
    </div>
  );
}

function AdminMessagingTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: messages, isLoading: loadingMsgs } = useAdminPrivateMessages();
  const { data: announcements, isLoading: loadingAnns } = useAdminAnnouncements();
  const markRead = useMarkMessageRead();
  const sendMessage = useSendAdminPrivateMessage();

  const [reply, setReply] = useState("");

  const handleReply = () => {
    if (!reply || !user) return;
    const adminMsg = messages?.find(m => m.senderId !== user.id);
    const receiverId = adminMsg?.senderId;

    if (!receiverId) return;

    sendMessage.mutate({
      senderId: user.id,
      receiverId: receiverId,
      content: reply
    }, {
      onSuccess: () => setReply("")
    });
  };

  useEffect(() => {
    const unread = messages?.filter(m => !m.isRead && m.receiverId === user?.id);
    unread?.forEach(m => markRead.mutate(m.id));
  }, [messages?.length]);

  return (
    <TabsContent value="admin_messages">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card border-primary/20 bg-black/60 shadow-2xl">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="flex items-center gap-2 text-primary">
              <MessageSquare className="w-5 h-5" />
              Direct Message from Admin
            </CardTitle>
            <CardDescription>Secure messages between you and the platform administration.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
              {loadingMsgs ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : messages?.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 italic">No messages from Admin yet.</p>
              ) : (
                messages?.map((msg: any) => (
                  <div key={msg.id} className={cn(
                    "p-4 rounded-2xl text-sm transition-all",
                    msg.senderId === user?.id
                      ? "bg-primary/10 border border-primary/20 ml-12"
                      : "bg-white/5 border border-white/10 mr-12"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-xs opacity-70">
                        {msg.senderId === user?.id ? "You" : "The Admin"}
                      </span>
                      <span className="text-[10px] opacity-40">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-white/90 leading-relaxed">{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <Textarea
                placeholder="Reply to the admin..."
                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <Button
                className="w-full gap-2 font-bold"
                disabled={!reply || sendMessage.isPending}
                onClick={handleReply}
              >
                <Send className="w-4 h-4" />
                {sendMessage.isPending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-accent/20 bg-black/60 shadow-2xl">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="flex items-center gap-2 text-accent">
              <Megaphone className="w-5 h-5" />
              Platform Announcements
            </CardTitle>
            <CardDescription>Important updates and news for creators.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingAnns ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : announcements?.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 italic">No announcements yet.</p>
              ) : (
                announcements?.map((ann: any) => (
                  <div key={ann.id} className={cn(
                    "p-5 rounded-2xl border transition-all",
                    ann.is_pinned ? "bg-primary/5 border-primary/30" : "bg-white/5 border-white/10"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      {ann.is_pinned && <Pin className="w-4 h-4 text-primary fill-primary/20" />}
                      <h3 className="font-bold text-lg text-gradient">{ann.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] opacity-40 uppercase tracking-widest">
                      <span>By Creator Relations Team</span>
                      <span>{formatDate(ann.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

function ReaderLibraryContent({ user }: { user: any }) {
  const { t } = useTranslation();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();
  const { data: subscriptions, isLoading: subsLoading } = useUserSubscriptions();
  const { data: upgradeRequests } = useUserUpgradeRequests();
  const { data: explicitLibrary, isLoading: explicitLibraryLoading } = useLibraryItems();

  const [upgradeSubscription, setUpgradeSubscription] = useState<any>(null);
  const [plansForUpgrade, setPlansForUpgrade] = useState<any[]>([]);

  // Function to open upgrade modal — plan.pricing is already embedded in the subscription
  const handleUpgradeClick = (subscription: any) => {
    // The subscription already has plan.pricing[] from get-user-subscriptions controller
    // No extra API call needed — just open the modal
    setPlansForUpgrade(subscription.plan ? [subscription.plan] : []);
    setUpgradeSubscription(subscription);
  };

  const isLoading = ordersLoading || subsLoading || explicitLibraryLoading;

  // order.order_items is an array of {id, productId, product: {title, coverUrl, type}, ...}
  // Filter out subscription order items (they have no product_id or collectionId)
  const purchasedItems = orders?.filter((o: any) => o.isVerified).flatMap((order: any) => order.order_items?.map((item: any) => {
    const product = item.product;
    const isCollection = !!product?.collectionId;
    // Skip items that have no real product or collection — these are subscription payments
    if (!item.productId && !product?.collectionId) return null;
    const uniqueKey = isCollection ? `col_${product?.collectionId}` : `prod_${item.productId || product?.id}`;
    return {
      id: item.productId || product?.id,
      collectionId: product?.collectionId || null,
      title: product?.title || 'Unknown',
      coverUrl: product?.coverUrl || '',
      type: product?.type || 'ebook',
      uniqueKey,
      addedAt: order.createdAt
    };
  }).filter(Boolean) || []) || [];

  const uniqueItems = Array.from(new Map(purchasedItems.map((item: any) => [item.uniqueKey, item])).values());
  const uniqueExplicitLibrary = Array.from(new Map((explicitLibrary || []).map((item: any) => [`prod_${item.id}`, item])).values());

  const allBooks = [...uniqueExplicitLibrary.map((item: any) => ({...item, isExplicit: true})), ...uniqueItems.map((item: any) => ({...item, isExplicit: false}))];
  // Filter out duplicates between explicit and purchased if any
  const finalBooks = Array.from(new Map(allBooks.map(item => [item.id || item.uniqueKey, item])).values());

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading library...</div>;
  }

  return (
    <TabsContent value="library">
      <div className="glass-card rounded-2xl p-4 sm:p-8 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl font-bold font-serif mb-2">{t("dashboard.library.title") || "مكتبتي"}</h2>
            <p className="text-muted-foreground">{t("dashboard.library.subtitle") || "مجموعتك من القصص والأصول"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders">
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary whitespace-nowrap">
                <Truck className="w-4 h-4" /> {t("dashboard.library.track_orders") || "تتبع الطلبات"}
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" className="gap-2 whitespace-nowrap">
                <ShoppingBag className="w-4 h-4" /> {t("dashboard.library.browse_store") || "تصفح المتجر"}
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="books" className="w-full">
          <TabsList className="mb-6 bg-background/50 border border-border h-auto p-1 flex flex-wrap sm:flex-nowrap justify-start w-full">
            <TabsTrigger value="books" className="py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all">
              <BookOpen className="w-4 h-4 mr-2" /> {t("dashboard.library.my_books", "كتبي ومنتجاتي")} ({finalBooks.length})
            </TabsTrigger>
            <TabsTrigger value="memberships" className="py-2.5 px-5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg transition-all">
              <Crown className="w-4 h-4 mr-2" /> {t("dashboard.library.my_memberships", "عضوياتي")} ({(subscriptions || []).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="mt-0 outline-none">
            {finalBooks.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-muted/20 border border-dashed border-border/50">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-bold mb-2">{t("dashboard.library.empty") || "مكتبتك فارغة"}</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t("dashboard.library.empty_desc") || "لم تقم بشراء أي قصص بعد."}
                </p>
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary/90">{t("dashboard.library.start_exploring") || "ابدأ الاستكشاف"}</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {finalBooks.map((item: any) => {
                  const typeIcon = item.type === 'audiobook' ? <Headphones className="w-3 h-3" /> : item.type === 'collection' ? <Sparkles className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />;
                  const typeColor = item.type === 'audiobook' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : item.type === 'collection' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-primary/15 text-primary border-primary/30';
                  const dateStr = (() => { try { return new Date(item.savedAt || item.addedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } })();

                  return (
                    <div key={item.id || item.uniqueKey} className="group relative flex flex-col rounded-2xl overflow-hidden bg-black/40 border border-white/8 hover:border-primary/40 shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                      {/* Cover */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                        <img
                          src={item.cover_url || item.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&q=80'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                        {/* Type badge top-left */}
                        <div className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${typeColor}`}>
                          {typeIcon} {item.type?.toUpperCase()}
                        </div>

                        {/* Locked overlay */}
                        {item.isExplicit && !item.hasAccess && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                              <Unlock className="w-5 h-5 text-white/70 rotate-180" />
                            </div>
                            <span className="text-[11px] font-bold text-white/80 text-center px-3">{t('dashboard.library.subscription_ended', 'انتهى الاشتراك')}</span>
                          </div>
                        )}

                        {/* Hover action overlay */}
                        {(!item.isExplicit || item.hasAccess) && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            {item.isExplicit && item.hasAccess ? (
                              <Link href={`/read/${item.id}`}>
                                <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/30">
                                  <BookOpen className="w-4 h-4 mr-1.5" /> {t('dashboard.library.read_now', 'اقرأ الآن')}
                                </Button>
                              </Link>
                            ) : item.type === 'ebook' ? (
                              <Link href={`/read/${item.id}`}>
                                <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/30">
                                  <BookOpen className="w-4 h-4 mr-1.5" /> {t("common.read") || "Read"}
                                </Button>
                              </Link>
                            ) : item.type === 'audiobook' ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="rounded-full bg-purple-600 hover:bg-purple-700 font-bold shadow-lg">
                                    <Headphones className="w-4 h-4 mr-1.5" /> {t('dashboard.library.listen_now', 'استمع الآن')}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-black/95 border-white/10 backdrop-blur-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-serif text-white">{item.title}</DialogTitle>
                                    <DialogDescription className="text-primary/60">
                                      {t("library.now_playing") || "Now Playing from Library"}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 min-h-[150px] flex items-center justify-center">
                                    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
                                      <AudiobookPlayer
                                        parts={item.audioParts?.length > 0 ? item.audioParts : [{ url: item.fileUrl, title: item.title, duration: item.audioDuration || 0 }]}
                                        title={item.title}
                                        coverUrl={item.coverUrl}
                                      />
                                    </Suspense>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : item.type === 'collection' ? (
                              <Link href={`/collection/${item.collectionId}`}>
                                <Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-lg">
                                  <Sparkles className="w-4 h-4 mr-1.5" /> {t("common.view") || "View"}
                                </Button>
                              </Link>
                            ) : (
                              <DownloadButton fileUrl={item.fileUrl} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card footer */}
                      <div className="p-3 flex flex-col gap-1.5">
                        <h4 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <History className="w-3 h-3 shrink-0" />
                          {dateStr}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </TabsContent>

          <TabsContent value="memberships" className="mt-0 outline-none">
            {(!subscriptions || subscriptions.length === 0) ? (
              <div className="text-center py-20 rounded-xl bg-muted/20 border border-dashed border-border/50">
                <Crown className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-bold mb-2">لا توجد عضويات نشطة</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  اشترك في مبدعيك المفضلين لفتح محتوى حصري.
                </p>
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary/90">ابحث عن مبدعين</Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>خطة العضوية</TableHead>
                      <TableHead>المبدع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => {
                      const pendingUpgrade = upgradeRequests?.find((req: any) => req.subscription_id === sub.id && req.status === 'pending');
                      return (
                      <TableRow key={sub.id} className="hover:bg-primary/5 transition-colors group">
                        <TableCell>
                          <div className="flex flex-col gap-1.5 py-1">
                            <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              {sub.plan?.name || "Membership"}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {sub.pricing?.billing_cycle && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-bold px-2 py-0.5">
                                  {sub.pricing.billing_cycle}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-4 text-xs bg-background/30 p-2 rounded-lg border border-white/5 w-fit">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider mb-0.5">تاريخ البدء</span>
                                        <span className="font-medium flex items-center gap-1.5 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-green-500/70"/> {sub.created_at ? formatDate(sub.created_at) : 'N/A'}</span>
                                    </div>
                                    <div className="w-px h-8 bg-border/50" />
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground text-[9px] uppercase tracking-wider mb-0.5">تاريخ الانتهاء</span>
                                        <span className="font-medium flex items-center gap-1.5 text-foreground"><History className="w-3.5 h-3.5 text-primary/70"/> {sub.current_period_end ? formatDate(sub.current_period_end) : 'N/A'}</span>
                                    </div>
                                    {sub.current_period_end && (
                                        <>
                                            <div className="w-px h-8 bg-border/50" />
                                            <div className="flex flex-col justify-center">
                                                {(() => {
                                                    const end = new Date(sub.current_period_end);
                                                    const now = new Date();
                                                    const diffTime = end.getTime() - now.getTime();
                                                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                    
                                                    if (daysRemaining < 0) {
                                                        return <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-md">انتهى الاشتراك</span>;
                                                    }
                                                    
                                                    const colorClass = daysRemaining <= 3 ? 'text-destructive bg-destructive/10 border-destructive/20' : 
                                                                     daysRemaining <= 7 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 
                                                                     'text-green-500 bg-green-500/10 border-green-500/20';
                                                    
                                                    return (
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${colorClass}`}>
                                                            يتبقى {daysRemaining} يوم
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {pendingUpgrade && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 w-fit px-2 py-0.5 rounded border border-amber-500/20">
                                    <Clock className="w-3 h-3" />
                                    <span>طلب ترقية قيد المراجعة (إلى {pendingUpgrade.target_billing_cycle})</span>
                                </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground align-top pt-5">
                          بواسطة {sub.creator_name || 'حكاياتي'}
                        </TableCell>
                        <TableCell className="align-top pt-5">
                          <Badge variant={sub.status === 'active' ? 'default' : 'outline'} className={
                            sub.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20 uppercase tracking-widest text-[10px]" :
                            sub.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase tracking-widest text-[10px]" :
                            sub.status === 'past_due' ? "bg-red-500/10 text-red-500 border-red-500/20 uppercase tracking-widest text-[10px]" :
                            "bg-gray-500/10 text-gray-400 border-gray-500/20 uppercase tracking-widest text-[10px]"
                          }>
                            {sub.status === 'active' ? '✓ نشط' : sub.status?.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right align-top pt-4">
                          {sub.status === 'active' ? (
                            <div className="flex items-center gap-2 justify-end">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className={`font-bold rounded-full gap-2 ${pendingUpgrade ? 'opacity-50 cursor-not-allowed' : 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10'}`}
                                    onClick={() => !pendingUpgrade && handleUpgradeClick(sub)}
                                    disabled={!!pendingUpgrade}
                                >
                                    <Crown className="w-4 h-4" /> {pendingUpgrade ? 'طلب ترقية قيد الانتظار' : 'ترقية الاشتراك'}
                                </Button>
                                <Link href={`/writer/${sub.creator_username}`}>
                                  <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 font-bold rounded-full">
                                    <Unlock className="w-4 h-4" /> فتح المكتبة
                                  </Button>
                                </Link>
                            </div>
                          ) : sub.status === 'pending' ? (
                            <span className="text-xs text-muted-foreground">في انتظار الموافقة...</span>
                          ) : (
                            <span className="text-xs text-amber-500">{sub.status}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <Suspense fallback={null}>
                {upgradeSubscription && (
                    <SubscriptionUpgradeModal
                        isOpen={!!upgradeSubscription}
                        onClose={() => setUpgradeSubscription(null)}
                        subscription={upgradeSubscription}
                        plans={plansForUpgrade}
                    />
                )}
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </TabsContent>
  );
}

function ReaderUnifiedActivity({ user }: { user: any }) {
  const { t } = useTranslation();
  const { data: orders, isLoading: loadingOrders } = useUserOrders();
  const { data: commissionsResp, isLoading: loadingComms } = useDesignRequests({ clientId: user.id });

  if (loadingOrders || loadingComms) {
    return (
      <div className="p-20 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>جاري تحميل نشاطك...</p>
      </div>
    );
  }

  const commissions = commissionsResp?.data || [];

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-serif">{t("dashboard.activity.storeOrders")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.activity.storeOrdersDesc")}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl divide-y divide-white/5">
          {(!orders || orders.length === 0) ? (
            <div className="p-12 text-center text-muted-foreground bg-white/2">
              <p>No store orders yet.</p>
            </div>
          ) : (
            orders.map((order: any) => (
              <div key={order.id} className="p-6 hover:bg-white/3 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary text-sm bg-primary/10 px-3 py-1 rounded">
                      ORDER #{order.id}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={cn(
                      "font-bold uppercase tracking-wider text-[10px] border px-3 py-1",
                      order.isVerified ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    )}>
                      {order.isVerified ? '✅ Payment Verified' : '⏳ Awaiting Approval'}
                    </Badge>
                    <span className="font-black text-xl text-primary">
                      {order.totalAmount} <span className="text-xs font-normal opacity-60">EGP</span>
                    </span>
                  </div>
                </div>

                <div className="grid gap-6">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl bg-white/2 border border-white/5 relative group">
                      <div className="w-20 h-28 shrink-0">
                        {item.isSubscription ? (
                          <div className="w-full h-full rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Crown className="w-8 h-8 text-primary opacity-60" />
                          </div>
                        ) : item.product?.coverUrl ? (
                          <img src={item.product.coverUrl} className="w-full h-full object-cover rounded-lg shadow-lg" />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center"><Package className="opacity-20" /></div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg">{item.product?.title || (item.isSubscription ? '👑 Membership Plan' : 'Product')}</h4>
                          <Badge variant="outline" className={cn("text-[10px] font-bold", getFulfillmentColor(item.fulfillmentStatus))}>
                            {getFulfillmentLabel(item.fulfillmentStatus)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className="text-primary font-bold">{item.price} EGP / unit</span>
                          {item.makerName && !item.isSubscription && (
                            <span className="flex items-center gap-1"><UserCog className="w-3 h-3" /> Maker: {item.makerName}</span>
                          )}
                          {item.isSubscription && (
                            <span className="flex items-center gap-1 text-primary/70"><Crown className="w-3 h-3" /> Membership Payment</span>
                          )}
                        </div>


                        {item.fulfillmentStatus !== 'pending' && (
                          <div className="mt-4 p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="w-12 h-12" /></div>
                            <h5 className="text-xs font-bold uppercase text-green-500 tracking-widest">Official Order Bill & Status</h5>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Accepted Date</p>
                                <p className="text-sm font-semibold">{item.acceptedAt ? formatDate(item.acceptedAt) : 'Recently'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Arrival Estimation</p>
                                <p className="text-sm font-bold text-primary">
                                  {item.estimatedDeliveryDays ? `${item.estimatedDeliveryDays} Working Days` : 'TBD'}
                                </p>
                              </div>
                            </div>
                            {item.trackingNumber && (
                              <div className="pt-2 border-t border-green-500/10">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Carrier Tracking</p>
                                <p className="text-sm font-mono text-purple-400 font-bold">{item.trackingNumber}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {item.fulfillmentStatus === 'pending' && !order.isVerified && (
                          <p className="text-xs text-amber-400 italic mt-2">
                            Awaiting admin verification of your payment proof...
                          </p>
                        )}
                        {item.fulfillmentStatus === 'pending' && order.isVerified && (
                          <p className="text-xs text-blue-400 italic mt-2 animate-pulse">
                            Payment verified! Awaiting maker to accept and set delivery date...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <PenTool className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-serif">Design Treasure Requests</h3>
            <p className="text-sm text-muted-foreground">Custom design projects and commissions</p>
          </div>
        </div>
        <CommissionsManager user={user} />
      </section>
    </div>
  );
}

function getFulfillmentColor(status: string) {
  switch (status) {
    case 'accepted': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'preparing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'shipped': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
}

function getFulfillmentLabel(status: string) {
  switch (status) {
    case 'accepted': return 'Accepted';
    case 'preparing': return 'Preparing';
    case 'shipped': return 'Shipped';
    case 'delivered': return 'Delivered';
    case 'rejected': return 'Rejected';
    default: return 'Pending Review';
  }
}

function DownloadButton({ fileUrl }: { fileUrl: string | null | undefined }) {
  const { t } = useTranslation();
  const download = useDownloadFile();

  if (!fileUrl) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full bg-white/20 border-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
      onClick={() => download.mutate(fileUrl)}
      disabled={download.isPending}
    >
      {download.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {t("common.download")}
        </>
      )}
    </Button>
  );
}
