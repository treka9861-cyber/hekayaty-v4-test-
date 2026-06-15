import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

import { PageSkeleton } from "@/components/ui/skeleton-loader";

// Global Loading component
const PageLoading = () => null;

// Lazy Page Imports
const Home = lazy(() => import("@/pages/Home"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const Writers = lazy(() => import("@/pages/Writers"));
const WriterStore = lazy(() => import("@/pages/WriterStore"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const WriterStudio = lazy(() => import("@/pages/WriterStudio"));
const MakerOrders = lazy(() => import("@/pages/creator/MakerOrders"));
const OrderTracking = lazy(() => import("@/pages/OrderTracking"));
const Cart = lazy(() => import("@/pages/Cart"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails"));
const CollectionDetails = lazy(() => import("@/pages/CollectionDetails"));
const ReadBook = lazy(() => import("@/pages/ReadBook"));
const Legal = lazy(() => import("@/pages/Legal"));
const HekayatyGuide = lazy(() => import("@/pages/HekayatyGuide"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const HekayatyStudio = lazy(() => import("@/pages/HekayatyStudio"));
const MediaHub = lazy(() => import("@/pages/MediaHub"));
const About = lazy(() => import("@/pages/About"));
const Blog = lazy(() => import("@/pages/Blog"));
const Contact = lazy(() => import("@/pages/Contact"));
const NotFound = lazy(() => import("@/pages/not-found"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/assets" component={Marketplace} />
        <Route path="/merchandise" component={Marketplace} />
        <Route path="/worldbuilders" component={Writers} />
        <Route path="/writer/:username" component={WriterStore} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/studio" component={WriterStudio} />
        <Route path="/studio/:id" component={WriterStudio} />
        <Route path="/maker-orders" component={MakerOrders} />
        <Route path="/orders" component={OrderTracking} />
        <Route path="/cart" component={Cart} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/book/:id" component={ProductDetails} />
        <Route path="/collection/:id" component={CollectionDetails} />
        <Route path="/read/:id" component={ReadBook} />
        <Route path="/legal" component={Legal} />
        <Route path="/guide" component={HekayatyGuide} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/hekayaty-studio" component={HekayatyStudio} />
        <Route path="/media" component={MediaHub} />
        <Route path="/about" component={About} />
        <Route path="/blog" component={Blog} />
        <Route path="/contact" component={Contact} />
        <Route path="/leaderboards/accounts" component={LeaderboardPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { useEffect } from "react";
import "./lib/i18n"; // Import i18n configuration
import { useTranslation } from "react-i18next";
import { persistence } from "./lib/persistence";
import { preloadWritersDashboard } from "./lib/writerDashboardPreloader";

const GlobalChat = lazy(() => import("@/components/GlobalChat").then(m => ({ default: m.GlobalChat })));

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Force browser to not restore scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    // Immediate scroll
    scrollToTop();

    // Secondary scroll for slower rendering pages
    const timeoutId = setTimeout(scrollToTop, 10);
    return () => clearTimeout(timeoutId);
  }, [location]);

  return null;
}

function AppContent() {
  const { i18n } = useTranslation();

  // Beyond Rocket Mode: Restore state and Preload Dashboard
  useEffect(() => {
    const initApp = async () => {
      try {
        const [session, user, cart] = await Promise.all([
          persistence.get("/api/session"),
          persistence.get("/api/user"),
          persistence.get("/api/cart")
        ]);

        if (session) queryClient.setQueryData(["/api/session"], session);
        if (user) queryClient.setQueryData(["/api/user"], user);
        if (cart) queryClient.setQueryData(["/api/cart"], cart);

        // Background preload the Writers Dashboard data
        preloadWritersDashboard();
      } catch (err) {
        console.warn("Beyond Rocket initialization partially failed", err);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    document.documentElement.setAttribute('translate', 'no');
    if (i18n.language === 'ar') {
      document.documentElement.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('font-arabic');
    }
  }, [i18n.language]);

  // Handle Chunk Load Errors (New Version Updates / Stale Cache)
  useEffect(() => {
    const handleChunkError = (e: any) => {
      const message = e.message || (e.reason && e.reason.message) || "";
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("Loading chunk") ||
        message.includes("MIME type") || // Catch the "MIME type of 'text/html'" error
        message.includes("Unexpected token '<'") || // Catch HTML returned as JS
        e.target?.tagName === "SCRIPT"; // Catch script load failures

      if (isChunkError) {
        console.warn("[Beyond Rocket] Version mismatch or connection error detected. Self-healing refresh starting...");
        // Use a small delay to avoid recursive refresh loops
        const lastReload = sessionStorage.getItem("last-perf-reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 5000) {
          sessionStorage.setItem("last-perf-reload", now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError, true);
    window.addEventListener("unhandledrejection", handleChunkError);
    window.addEventListener("vite:preloadError", handleChunkError);

    return () => {
      window.removeEventListener("error", handleChunkError, true);
      window.removeEventListener("unhandledrejection", handleChunkError);
      window.removeEventListener("vite:preloadError", handleChunkError);
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <Router />
      <Suspense fallback={null}>
        <GlobalChat />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
