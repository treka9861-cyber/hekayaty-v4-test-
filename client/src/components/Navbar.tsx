import { Link, useLocation } from "wouter";
import { Feather, BookOpen, ShoppingBag, LayoutDashboard, User, Palette, Store, Users, ShieldCheck, Menu, X, PenTool, Globe, Video, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useState } from "react";
import { useAdminPrivateMessages } from "@/hooks/use-admin-system";
import { useMakerOrders } from "@/hooks/use-physical-orders";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar({ hideNav }: { hideNav?: boolean } = {}) {
  if (hideNav) return null;
  const [location] = useLocation();
  const { data: cartItems } = useCart();
  const { user, logoutMutation } = useAuth();
  const { t, i18n } = useTranslation();
  const cartCount = cartItems?.length || 0;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: adminMessages } = useAdminPrivateMessages();
  const unreadMessagesCount = adminMessages?.filter(m => !m.isRead && m.receiverId === user?.id).length || 0;

  const { data: makerOrders } = useMakerOrders();
  const pendingOrdersCount = makerOrders?.filter((o: any) => o.fulfillmentStatus === 'pending').length || 0;

  const navItems = [
    { label: t("nav.marketplace"), href: "/marketplace", icon: ShoppingBag },
    { label: t("nav.about", "من نحن"), href: "/about", icon: Users },
    { label: t("nav.worldbuilders"), href: "/worldbuilders", icon: Palette },
    { label: "أفضل الحسابات", href: "/leaderboards/accounts", icon: Trophy },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: t("nav.admin"), href: "/admin", icon: ShieldCheck });
  }

  if (user?.role === 'writer' || user?.role === 'artist') {
    navItems.push({ label: t("nav.studio"), href: "/studio", icon: PenTool });
  }

  return (
    <nav className={`fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/10 shadow-lg safe-area-padding-top ${location === '/' ? 'bg-black' : 'bg-[#1a0f0a]/90'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group touch-target" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-gradient-to-tr from-primary to-accent p-2 rounded-lg group-hover:scale-110 transition-transform duration-300">
              <Feather className="w-6 h-6 text-white" />
            </div>
            <span className="font-serif text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {i18n.language === 'ar' ? 'حكاياتي' : 'Hekayaty'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-8 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 text-sm font-medium transition-all duration-200 touch-target
                    ${isActive ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-primary hover:scale-105"}
                  `}
                >
                  {Icon && <Icon className="w-4 h-4 opacity-80" />}
                  <span className="hidden lg:inline">{item.label}</span>
                  {(item.href === '/studio' || item.href === '/admin') && unreadMessagesCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold shadow-lg shadow-primary/20 animate-pulse">
                      {unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Utility Group */}
            <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2 pr-1 sm:pr-2 border-r border-white/5">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-foreground hover:text-primary transition-colors touch-target">
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {(user.role === "writer" || user.role === "artist") && (
                    <Link href={`/writer/${user.username}`} className="hidden md:block">
                      <Button variant="ghost" size="sm" className="h-9 gap-2 text-primary hover:text-primary/80 hover:bg-primary/5 transition-all touch-target">
                        <Store className="w-4 h-4" />
                        <span className="hidden lg:inline">{t("nav.myStore")}</span>
                      </Button>
                    </Link>
                  )}
                  <Link href="/dashboard" className="hidden sm:block relative">
                    <Button variant="ghost" size="sm" className="h-9 hover:bg-white/5 transition-all touch-target font-medium">
                      {user.role === "writer" || user.role === "artist" ? t("nav.dashboard") : t("nav.profile")}
                    </Button>
                    {pendingOrdersCount > 0 && (user.role === "writer" || user.role === "artist") && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold shadow-lg shadow-red-500/20 animate-pulse">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden sm:flex h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all touch-target"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="h-9 hover:bg-white/5 transition-all touch-target">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link href="/auth?mode=register" className="hidden sm:block">
                    <Button className="h-9 bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg shadow-primary/10 transition-all touch-target px-6">
                      {t("nav.getStarted")}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden touch-target no-select"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 overflow-hidden bg-black/95 backdrop-blur-xl"
            >
              <div className="flex flex-col space-y-2 py-4 max-h-[calc(100dvh-64px)] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 mb-2">
                  <LanguageSwitcher />
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      mobile-menu-item flex items-center gap-3 rounded-lg
                      ${isActive ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}
                    `}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span className="flex-1">{item.label}</span>
                    {(item.href === '/studio' || item.href === '/admin') && unreadMessagesCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                        {unreadMessagesCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Mobile User Actions */}
              {user ? (
                <>
                  {(user.role === "writer" || user.role === "artist") && (
                    <Link
                      href={`/writer/${user.username}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mobile-menu-item flex items-center gap-3 rounded-lg text-primary"
                    >
                      <Store className="w-5 h-5" />
                      {t("nav.myStore")}
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-menu-item flex items-center justify-between gap-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      {user.role === "writer" || user.role === "artist" ? t("nav.dashboard") : t("nav.profile")}
                    </div>
                    {pendingOrdersCount > 0 && (user.role === "writer" || user.role === "artist") && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-pulse">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      logoutMutation.mutate();
                      setMobileMenuOpen(false);
                    }}
                    className="mobile-menu-item flex items-center gap-3 rounded-lg text-left text-red-400"
                  >
                    <X className="w-5 h-5" />
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mobile-menu-item flex items-center gap-3 rounded-lg"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/auth?mode=register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white touch-target">
                      {t("nav.getStarted")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </nav>
);
}
