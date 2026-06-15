import { Link } from "wouter";
import { BookOpen, Star, ChevronLeft } from "lucide-react";
import { useAuthoredBooks } from "@/hooks/use-book-claims";
import { ExtendedStoreSettings } from "./types";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface StoreAuthoredBooksProps {
  user: any;
  settings: ExtendedStoreSettings;
  isOwnStore: boolean;
  themeColor: string;
  fontClass: string;
}

export function StoreAuthoredBooks({ user, themeColor, fontClass }: StoreAuthoredBooksProps) {
  const { t } = useTranslation();
  const { data: books, isLoading } = useAuthoredBooks(user.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-32 opacity-60">
        <BookOpen className="w-16 h-16 mb-4 opacity-50" style={{ color: themeColor }} />
        <h3 className={`text-2xl font-bold mb-2 ${fontClass}`}>{t("writerStore.noAuthoredBooks", "لم يتم ربط أي كتب بهذا الكاتب بعد")}</h3>
        <p className="text-center max-w-md">{t("writerStore.noAuthoredBooksDesc", "ستظهر هنا الكتب التي شارك الكاتب في تأليفها وتمت الموافقة عليها من قبل الناشر.")}</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 animate-in fade-in duration-500" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40` }}
        >
          <BookOpen className="w-5 h-5" style={{ color: themeColor }} />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${fontClass}`}>
            مؤلفات الكاتب
          </h2>
          <p className="text-white/50 text-sm">أعمال شارك {user.displayName} في كتابتها</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {books.map((link: any) => {
          const book = link.book;
          if (!book) return null;
          
          return (
            <Link key={link.id} href={`/book/${book.id}`}>
              <div className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer h-full flex flex-col">
                <div className="aspect-[2/3] w-full overflow-hidden relative bg-black/40">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  {/* Rating Badge */}
                  {book.review_count > 0 && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-[10px] font-bold text-white">
                        {(book.rating > 5 ? book.rating / 10 : book.rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-primary/80 font-bold mb-1">
                    {book.genre || 'كتاب'}
                  </span>
                  <h3 className={`font-bold text-base text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight ${fontClass}`}>
                    {book.title}
                  </h3>

                  <div className="mt-auto pt-4 flex items-center justify-between text-white/40 group-hover:text-white/80 transition-colors">
                    <span className="text-xs font-medium">عرض الكتاب</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
