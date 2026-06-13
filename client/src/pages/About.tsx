import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { Target, Heart, Rocket, Users, Shield, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import ourStoryImg from "@/assets/WhatsApp Image 2026-04-30 at 2.41.09 PM.jpeg";

export default function About() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`min-h-screen bg-black text-white ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <SEO 
        title={t("about.title")} 
        description={t("about.heroText")}
      />
      <Navbar />

      <main className="pt-32 pb-20 overflow-hidden">
        {/* Hero Section */}
        <section className="container-responsive relative mb-24 px-4 sm:px-6 lg:px-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[150px] -z-10 rounded-full opacity-30" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-black tracking-widest uppercase mb-6 border border-primary/30">
              {t("about.subtitle")}
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif font-black mb-8 leading-tight text-balance">
              {isArabic ? (
                 <>
                   {t("about.title")} – <span className="text-primary italic">حكاياتي</span>
                 </>
              ) : (
                <>
                  {t("about.title")} – <span className="text-primary italic">Hekayaty</span>
                </>
              )}
            </h1>
            <p className="text-xl text-white/70 leading-relaxed max-w-3xl mx-auto">
              {t("about.heroText")}
            </p>
          </motion.div>
        </section>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="container-responsive px-4 sm:px-6 lg:px-8 space-y-32"
        >
          {/* Our Story */}
          <motion.section variants={itemVariants} className="grid md:grid-cols-2 gap-16 items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Heart size={24} />
                <h2 className="text-3xl font-serif font-black uppercase tracking-tight">{t("about.ourStory")}</h2>
              </div>
              <p className="text-white/70 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {t("about.storyContent")}
              </p>
            </div>
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 group bg-white/5">
                <img 
                  src={ourStoryImg} 
                  alt="قصة حكاياتي" 
                />
            </div>
          </motion.section>

          {/* Our Mission */}
          <motion.section variants={itemVariants} className="bg-white/[0.03] border border-white/10 rounded-[40px] p-12 md:p-20 text-center space-y-8">
             <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/30">
                <Target size={40} className="text-primary" />
             </div>
             <h2 className="text-4xl md:text-5xl font-serif font-black uppercase tracking-tighter">{t("about.mission")}</h2>
             <p className="text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed font-medium italic">
                "{t("about.missionContent")}"
             </p>
          </motion.section>

          {/* What We Offer */}
          <motion.section variants={itemVariants} className="space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif font-black uppercase">{t("about.offer")}</h2>
              <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: t("about.offerPublishing"), desc: t("about.offerPublishingDesc"), icon: BookOpen },
                { title: t("about.offerMarketplace"), desc: t("about.offerMarketplaceDesc"), icon: Users },
                { title: t("about.offerAI"), desc: t("about.offerAIDesc"), icon: Sparkles },
                { title: t("about.offerCommunity"), desc: t("about.offerCommunityDesc"), icon: Heart }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-primary/50 transition-colors group">
                   <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="text-white group-hover:text-primary transition-colors" />
                   </div>
                   <h3 className="text-xl font-black mb-4">{item.title}</h3>
                   <p className="text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Our Vision */}
          <motion.section variants={itemVariants} className="grid md:grid-cols-2 gap-16 items-center">
             <div className="order-2 md:order-1 relative aspect-video rounded-3xl overflow-hidden border border-white/10 group">
                 <img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="الرؤية" />
             </div>
             <div className="order-1 md:order-2 space-y-6">
              <div className="flex items-center gap-3 text-primary">
                <Rocket size={24} />
                <h2 className="text-3xl font-serif font-black uppercase tracking-tight">{t("about.vision")}</h2>
              </div>
              <p className="text-white/80 text-xl font-medium leading-relaxed">
                {t("about.visionContent")}
              </p>
              <p className="text-white/60 leading-relaxed">
                {t("about.visionSub")}
              </p>
            </div>
          </motion.section>

          {/* Why Different */}
          <motion.section variants={itemVariants} className="space-y-12">
            <h2 className="text-4xl font-serif font-black text-center uppercase tracking-tighter">{t("about.different")}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: t("about.diffEcosystem"), desc: t("about.diffEcosystemDesc") },
                { title: t("about.diffMonetization"), desc: t("about.diffMonetizationDesc") },
                { title: t("about.diffAI"), desc: t("about.diffAIDesc") }
              ].map((item, i) => (
                <div key={i} className={`p-8 border-primary bg-white/[0.02] space-y-4 ${isArabic ? 'border-r-4' : 'border-l-4'}`}>
                   <h3 className="text-xl font-black">{item.title}</h3>
                   <p className="text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section variants={itemVariants} className="text-center space-y-8 pt-20 pb-10">
             <h2 className="text-5xl md:text-6xl font-serif font-black">{t("about.ctaTitle")}</h2>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/auth">
                  <Button className="h-16 px-12 bg-primary text-black text-lg font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform">
                    {t("about.ctaJoin")}
                  </Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="outline" className="h-16 px-12 border-white/20 text-lg font-black uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all">
                    {t("about.ctaExplore")}
                  </Button>
                </Link>
             </div>
          </motion.section>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
