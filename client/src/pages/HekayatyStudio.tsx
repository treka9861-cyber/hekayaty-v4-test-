import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Sparkles,
  Shirt,
  BookOpen,
  Film,
  Music,
  Megaphone,
  Youtube,
  Map,
  Users,
  Mic,
  Star,
  Layout,
  Globe,
  Radio,
  Gamepad,
  Video,
  PenTool,
  Trophy,
  Package,
  Cpu,
  Zap,
  Activity,
  Layers as LayersIcon
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// --- Advanced UI Components ---

const HUDElement = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <div className={cn("absolute pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity duration-1000", className)}>
        <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.3em] text-primary">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            {children}
        </div>
    </div>
);

const FloatingParticles = ({ color = "primary" }: { color?: "primary" | "cyan" | "violet" }) => {
  const bgColor = color === "primary" ? "bg-primary/30" : color === "cyan" ? "bg-cyan-400/30" : "bg-violet-500/30";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => (
        <motion.div
           key={i}
           className={cn("absolute w-[2px] h-[2px] rounded-full", bgColor)}
           initial={{ 
             x: Math.random() * 100 + "%", 
             y: Math.random() * 100 + "%",
             opacity: 0 
           }}
           animate={{ 
             y: [null, "-50%"],
             opacity: [0, 0.5, 0],
             scale: [1, 3, 1]
           }}
           transition={{ 
             duration: Math.random() * 10 + 10, 
             repeat: Infinity, 
             ease: "linear",
             delay: Math.random() * 15
           }}
        />
      ))}
    </div>
  );
};

const CinematicSectionHeader = ({ layer, title, subtitle, variant = "gold" }: { layer: string; title: string; subtitle?: string; variant?: "gold" | "cyan" | "violet" }) => {
    const gradientClass = variant === "gold" ? "text-gradient" : variant === "cyan" ? "bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" : "bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-600 drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]";
    return (
        <div className="mb-32 space-y-6 text-center lg:text-left">
            <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "80px" }}
                className={cn("h-[2px] mb-8 mx-auto lg:mx-0", variant === "gold" ? "bg-primary" : variant === "cyan" ? "bg-cyan-400" : "bg-violet-400")}
            />
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className={cn("text-[12px] font-black uppercase tracking-[0.8em] block mb-4", variant === "gold" ? "text-primary/60" : variant === "cyan" ? "text-cyan-400/60" : "text-violet-400/60")}
            >
              {layer}
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={cn("text-4xl sm:text-6xl md:text-[8rem] font-serif font-black leading-[0.9] tracking-tighter", gradientClass)}
            >
              {title}
            </motion.h2>
            {subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="text-white text-xl md:text-3xl max-w-4xl font-sans font-light italic leading-relaxed drop-shadow-lg"
              >
                {subtitle}
              </motion.p>
            )}
        </div>
    );
};

const PremiumServiceCard = ({ icon: Icon, title, items, variant = "gold" }: { icon: any; title: string; items: string[]; variant?: "gold" | "cyan" | "violet" }) => {
    const borderColor = variant === "gold" ? "border-primary/20 hover:border-primary/60 hover:shadow-[0_0_50px_rgba(212,175,55,0.2)]" : variant === "cyan" ? "border-cyan-400/20 hover:border-cyan-400/60 hover:shadow-[0_0_50px_rgba(34,211,238,0.2)]" : "border-violet-400/20 hover:border-violet-400/60 hover:shadow-[0_0_50px_rgba(139,92,246,0.2)]";
    const iconColor = variant === "gold" ? "text-primary" : variant === "cyan" ? "text-cyan-400" : "text-violet-400";
    const glowColor = variant === "gold" ? "bg-primary/5" : variant === "cyan" ? "bg-cyan-400/5" : "bg-violet-400/5";

    return (
        <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
                "p-14 rounded-[4rem] bg-[#1a110a]/40 backdrop-blur-2xl border transition-all duration-1000 relative overflow-hidden group h-full flex flex-col",
                borderColor
            )}
        >
            <HUDElement className="top-8 right-8">DATA_SYNC_ACTIVE</HUDElement>
            <HUDElement className="bottom-8 left-8">CRYSTAL_NODE_[{Math.floor(Math.random() * 999)}]</HUDElement>
            
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000", glowColor)} />
            
            <div className="relative z-10 flex flex-col h-full space-y-12">
                <div className={cn("w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-1000 group-hover:scale-110", iconColor)}>
                    <Icon size={32} className="relative z-10 sm:hidden" strokeWidth={1} />
                    <Icon size={44} className="relative z-10 hidden sm:block" strokeWidth={1} />
                    <div className={cn("absolute inset-0 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity", iconColor === "text-primary" ? "bg-primary" : iconColor === "text-cyan-400" ? "bg-cyan-400" : "bg-violet-400")} />
                </div>
                
                <h3 className="text-3xl sm:text-4xl font-serif font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/40 transition-all">{title}</h3>
                
                <ul className="space-y-6 flex-1">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-5 text-base font-bold text-white/30 group-hover:text-white/80 transition-all font-sans">
                            <Zap size={14} className={cn("shrink-0", iconColor)} />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className={cn("absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000", iconColor === "text-primary" ? "bg-primary" : iconColor === "text-cyan-400" ? "bg-cyan-400" : "bg-violet-400")} />
        </motion.div>
    );
};

// --- Page Sections ---

const PortfolioHero = () => {
    const { t } = useTranslation();
    const { scrollYProgress } = useScroll();
    const y = useTransform(scrollYProgress, [0, 0.5], [0, 200]);
    
    return (
        <section className="relative h-[110vh] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#120a05] via-transparent to-[#120a05] z-10" />
                <motion.div style={{ y }} className="w-full h-full">
                    <img src="/images/studio-bg.png" className="w-full h-full object-cover object-center grayscale-[0.2] sepia-[0.4]" alt="Epic Background" />
                </motion.div>
                <div className="absolute inset-0 bg-black/40 z-10" />
                <FloatingParticles color="primary" />
            </div>
            
            <div className="container-responsive relative z-20 text-center space-y-16">
                <motion.div
                   initial={{ opacity: 0, letterSpacing: "0.2em" }}
                   animate={{ opacity: 1, letterSpacing: "0.8em" }}
                   transition={{ duration: 2 }}
                   className="text-[12px] font-black uppercase text-primary mb-12 block"
                >
                    {t("studioPage.hero.tagline")}
                </motion.div>
                
                <motion.h1 
                    className="text-5xl sm:text-8xl md:text-[14rem] font-serif font-black tracking-tighter leading-[0.8] drop-shadow-[0_40px_80px_rgba(0,0,0,1)]"
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    <span className="block text-white/90">{t("studioPage.hero.title1")}</span>
                    <span className="block text-gradient mt-4">{t("studioPage.hero.title2")}</span>
                </motion.h1>
                
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 2 }}
                    className="text-2xl md:text-5xl text-white max-w-6xl mx-auto font-sans leading-relaxed font-extralight italic drop-shadow-2xl"
                >
                    {t("studioPage.hero.subtitle")}
                </motion.p>
            </div>
            
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-8 opacity-40">
                <div className="w-[1px] h-24 bg-gradient-to-b from-primary to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[1em] text-white/40">SYSTEM_INIT</span>
            </div>
        </section>
    );
};

const LayerCorePortfolio = () => {
    const { t } = useTranslation();
    const coreServices = [
        { title: t("studioPage.services.merch.title"), icon: Shirt, items: t("studioPage.services.merch.items", { returnObjects: true }) as string[] },
        { title: t("studioPage.services.marketing.title"), icon: Megaphone, items: t("studioPage.services.marketing.items", { returnObjects: true }) as string[] },
        { title: t("studioPage.services.youtube.title"), icon: Youtube, items: t("studioPage.services.youtube.items", { returnObjects: true }) as string[] }
    ];

    return (
        <section className="relative py-72 overflow-hidden">
            <div className="absolute top-0 right-0 w-2/3 h-full z-0 opacity-40 group overflow-hidden">
                <img src="/images/studio-core.png" className="w-full h-full object-cover object-center rounded-l-[10rem] grayscale-[0.5] hover:grayscale-0 transition-all duration-2000" alt="Core Craft" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#120a05]/80 to-[#120a05]" />
            </div>
            
            <div className="container-responsive relative z-10">
                <CinematicSectionHeader 
                    layer={t("studioPage.layers.core.title")}
                    title="البداية"
                    subtitle={t("studioPage.layers.core.subtitle")}
                    variant="gold"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:pr-32">
                    {coreServices.map((s, i) => (
                        <PremiumServiceCard key={i} {...s} variant="gold" />
                    ))}
                </div>
            </div>
        </section>
    );
};

const LayerHighValuePortfolio = () => {
    const { t } = useTranslation();
    const highValueServices = [
        { title: t("studioPage.services.audiobook.title"), icon: Mic, items: t("studioPage.services.audiobook.items", { returnObjects: true }) as string[] },
        { title: t("studioPage.services.film.title"), icon: Film, items: t("studioPage.services.film.items", { returnObjects: true }) as string[] },
        { title: t("studioPage.services.identity.title"), icon: Users, items: t("studioPage.services.identity.items", { returnObjects: true }) as string[] }
    ];

    return (
        <section className="relative py-72 overflow-hidden bg-[#1a110a]/50">
            <div className="absolute top-0 left-0 w-1/2 h-full z-0 opacity-40 group overflow-hidden">
                <img src="/images/studio-audio.png" className="w-full h-full object-cover object-center rounded-r-[10rem] border-r-4 border-cyan-400/20" alt="Audio Craft" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#120a05]/80 to-[#120a05]" />
            </div>
            
            <div className="container-responsive relative z-10 flex flex-col items-end text-right">
                <CinematicSectionHeader 
                    layer={t("studioPage.layers.highValue.title")}
                    title="الارتقاء"
                    subtitle={t("studioPage.layers.highValue.subtitle")}
                    variant="cyan"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:pl-32 w-full">
                    {highValueServices.map((s, i) => (
                        <PremiumServiceCard key={i} {...s} variant="cyan" />
                    ))}
                </div>
            </div>
            <FloatingParticles color="cyan" />
        </section>
    );
};

const LayerPremiumPortfolio = () => {
    const { t } = useTranslation();
    const premiumServices = [
        { title: t("studioPage.services.world.title"), icon: Map, items: t("studioPage.services.world.items", { returnObjects: true }) as string[] },
        { title: t("studioPage.services.interactive.title"), icon: Gamepad, items: t("studioPage.services.interactive.items", { returnObjects: true }) as string[] }
    ];

    return (
        <section className="relative py-72 overflow-hidden">
             <div className="absolute bottom-0 right-0 w-1/2 h-full z-0 opacity-40 group overflow-hidden">
                <img src="/images/studio-world.png" className="w-full h-full object-cover object-center rounded-l-[10rem] border-l-4 border-violet-500/20" alt="World Craft" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#120a05]/80 to-[#120a05]" />
            </div>
            
            <div className="container-responsive relative z-10">
                <CinematicSectionHeader 
                    layer={t("studioPage.layers.premium.title")}
                    title="اللانهاية"
                    subtitle={t("studioPage.layers.premium.subtitle")}
                    variant="violet"
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:pr-32">
                    {premiumServices.map((s, i) => (
                        <PremiumServiceCard key={i} {...s} variant="violet" />
                    ))}
                </div>
                
                <motion.div 
                   whileHover={{ scale: 1.02 }}
                   className="mt-24 p-24 rounded-[5rem] bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border border-violet-500/20 relative overflow-hidden group"
                >
                    <HUDElement className="top-10 left-10">ECOSYSTEM_GEN_[7.3.0]</HUDElement>
                    <div className="absolute -right-20 -bottom-20 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-2000 rotate-12 scale-150">
                        <Globe size={400} className="text-violet-500" />
                    </div>
                    
                    <div className="relative z-10 space-y-6 sm:space-y-10">
                        <Globe className="text-violet-400 sm:w-16 sm:h-16 w-12 h-12" strokeWidth={1} />
                        <h4 className="text-3xl sm:text-5xl font-serif font-black text-white">إمبراطوريات المشتركين المخصصة</h4>
                        <p className="text-white/40 text-lg sm:text-2xl font-sans max-w-3xl font-light italic leading-relaxed">
                            يُمنح كل مشترك بوابة مخصصة عالية الأداء - قلعة رقمية تعمل كمركز قيادة لكونه المتوسع باستمرار.
                        </p>
                    </div>
                </motion.div>
            </div>
            <FloatingParticles color="violet" />
        </section>
    );
};

const MarketplaceCommunityPortfolio = () => {
    const { t } = useTranslation();
    return (
        <section className="bg-[#120a05] py-72 border-t border-white/5 relative">
            <div className="container-responsive">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-40">
                    {/* Marketplace */}
                    <div className="space-y-24">
                        <CinematicSectionHeader layer="دعم المواهب" title="النقابة" subtitle={t("studioPage.marketplace.subtitle")} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {(t("studioPage.marketplace.items", { returnObjects: true }) as string[]).map((item, i) => (
                                <div key={i} className="flex items-center gap-8 p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all duration-700 group">
                                    <div className="p-4 rounded-xl bg-primary/10 text-primary-foreground group-hover:bg-primary transition-all">
                                        <LayersIcon size={20} className="group-hover:scale-125 transition-transform" />
                                    </div>
                                    <span className="text-xl font-sans font-bold text-white/40 group-hover:text-white transition-colors">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Community */}
                    <div className="space-y-24">
                        <CinematicSectionHeader layer="صدى التفاعل" title="الرابطة" />
                        <div className="space-y-8">
                            {[
                                { title: t("studioPage.community.merch"), icon: Package },
                                { title: t("studioPage.community.competitions"), icon: Trophy },
                                { title: t("studioPage.community.challenges"), icon: PenTool },
                                { title: t("studioPage.community.events"), icon: Users }
                            ].map((c, i) => (
                                <div key={i} className="flex items-center gap-12 p-12 bg-[#2d1b0d]/20 rounded-[3rem] border border-[#d4af37]/5 hover:border-primary/40 hover:scale-[1.02] transition-all duration-700 group">
                                    <div className="p-6 rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/20 group-hover:ring-primary shadow-2xl">
                                        <c.icon size={32} strokeWidth={1} />
                                    </div>
                                    <span className="text-3xl font-serif font-black text-white/40 group-hover:text-primary transition-all tracking-tighter">{c.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const FinalPortfolioTag = () => {
    const { t } = useTranslation();
    return (
        <section className="relative py-96 overflow-hidden min-h-screen flex items-center justify-center">
            <div className="absolute inset-0 z-0">
                <img src="/images/studio-final.png" className="w-full h-full object-cover object-center grayscale-[0.2]" alt="Final Portal" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0703] via-[#120a05]/90 to-transparent" />
                <div className="absolute inset-0 bg-black/60" />
            </div>
            
            <div className="container-responsive relative z-10 text-center space-y-24">
                <motion.h2 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-5xl sm:text-8xl md:text-[18rem] font-serif font-black tracking-tighter leading-[0.7] text-white drop-shadow-[0_0_80px_rgba(255,215,0,0.4)]"
                >
                    {t("studioPage.final.title")}<br/>
                    <span className="text-gradient leading-relaxed">{t("studioPage.final.titleHighlight")}</span>
                </motion.h2>
                
                <p className="text-white text-3xl md:text-6xl max-w-7xl mx-auto font-sans leading-relaxed font-extralight italic drop-shadow-xl">
                    {t("studioPage.final.subtitle")}
                </p>

                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 2 }}
                    className="pt-48 flex flex-col items-center gap-16"
                >
                    <div className="w-[1px] h-48 bg-gradient-to-b from-primary to-transparent" />
                    <span className="text-[12px] md:text-xl font-black uppercase tracking-[1.5em] text-primary animate-pulse drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
                        {t("studioPage.final.footerTag")}
                    </span>
                    <div className="flex gap-16 text-[9px] font-black uppercase tracking-[0.6em] text-white/20">
                        <Activity size={24} className="animate-pulse" />
                        <Cpu size={24} className="hover:text-primary transition-colors cursor-help" />
                        <Zap size={24} className="animate-ping" />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const HekayatyStudio = () => {
  const { i18n } = useTranslation();
  return (
    <div className={cn(
        "min-h-screen bg-[#120a05] text-white selection:bg-primary/40 selection:text-white pb-0 scroll-smooth",
        i18n.language === 'ar' ? 'font-arabic' : 'font-sans'
    )}>
      <Navbar />
      <PortfolioHero />
      <LayerCorePortfolio />
      <LayerHighValuePortfolio />
      <LayerPremiumPortfolio />
      <MarketplaceCommunityPortfolio />
      <FinalPortfolioTag />
      
      {/* Cinematic Simple Footer */}
      <footer className="py-32 border-t border-white/5 bg-[#0c0703] relative overflow-hidden">
        <HUDElement className="top-10 left-10">TERMINAL_SECURE</HUDElement>
        <div className="container-responsive flex flex-col md:flex-row justify-between items-center gap-16">
            <div className="text-4xl font-serif font-black text-gradient tracking-tighter">Hekayaty Studio</div>
            <div className="flex gap-24 text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                <span className="hover:text-primary transition-colors cursor-help">CORE_DNA</span>
                <span className="hover:text-cyan-400 transition-colors cursor-help">HIGH_VLTG</span>
                <span className="hover:text-violet-400 transition-colors cursor-help">INF_LUP</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10 italic">© 2026 Collective Intelligence</div>
        </div>
      </footer>
    </div>
  );
};

export default HekayatyStudio;
