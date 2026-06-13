import { Feather, Facebook, Instagram, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import clickersLogo from "@/assets/WhatsApp Image 2026-04-30 at 4.41.50 PM.jpeg";

export function Footer() {
  const { t, i18n } = useTranslation();
  const [location] = useLocation();
  const isArabic = i18n.language === 'ar';

  return (
    <footer className={`border-t border-border mt-20 backdrop-blur-sm ${location === '/' ? 'bg-black' : 'bg-card/50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <Feather className="w-6 h-6 text-primary" />
              <span className="font-serif text-xl font-bold">Hekayaty</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footer.aboutText", "نمكّن كل قاص من بناء عوالمه ومشاركتها مع الكون.")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t("footer.quickLinks", "المنصة")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary">{t("nav.about", "من نحن")}</Link></li>
              <li><Link href="/blog" className="hover:text-primary">{t("nav.blog", "قصص وأدلة")}</Link></li>
              <li><Link href="/contact" className="hover:text-primary">{t("nav.contact", "تواصل معنا")}</Link></li>
              <li><Link href="/marketplace" className="hover:text-primary">{t("nav.marketplace", "المتجر")}</Link></li>
              <li><Link href="/studio" className="hover:text-primary">{t("nav.studio", "استوديو الكاتب")}</Link></li>
              <li><Link href="/worldbuilders" className="hover:text-primary">{t("nav.worldbuilders", "بناة العوالم")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t("footer.legal", "القانونية")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/legal" className="hover:text-primary">{t("footer.terms", "شروط الخدمة")}</Link></li>
              <li><Link href="/legal" className="hover:text-primary">{t("footer.privacy", "سياسة الخصوصية")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t("footer.followUs", "تابعنا")}</h4>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/share/1JgtgTtMiv/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/hekayaty_ma?igsh=MWRmZ2R2bHQyM256cA=="
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@hekayaty0?_r=1&_t=ZS-93mDnETkKUK"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="http://www.youtube.com/@Hekayaty-q2i"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-12 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3 group">
            <span className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">{isArabic ? "بواسطة" : "Created By"}</span>
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src={clickersLogo} 
                alt="Clickers Creations" 
                className="h-16 w-auto object-contain relative z-10 transition-transform duration-500 group-hover:scale-105" 
              />
            </div>
            <p className="text-sm font-serif font-black tracking-widest text-white/80 mt-2">
              CLICKERS CREATIONS <span className="text-primary italic">COMPANY</span>
            </p>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">
              © {new Date().getFullYear()} Hekayaty Platform. {t("footer.copyright", "جميع الحقوق محفوظة.")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
