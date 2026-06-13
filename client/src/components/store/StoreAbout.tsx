import { StoreProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Globe, Twitter, Instagram, Mail, Award, BookOpen, GraduationCap, Youtube, Facebook, Linkedin } from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter:   <Twitter className="w-5 h-5" />,
  instagram: <Instagram className="w-5 h-5" />,
  youtube:   <Youtube className="w-5 h-5" />,
  facebook:  <Facebook className="w-5 h-5" />,
  linkedin:  <Linkedin className="w-5 h-5" />,
  website:   <Globe className="w-5 h-5" />,
};

export function StoreAbout({ user, settings, themeColor, fontClass }: StoreProps) {
  const isPublishingHouse = settings.isPublishingHouse || false;

  // Pull genre/language/education from storeSettings if available, with sensible defaults
  const genres: string[] = (settings as any).genres || [];
  const languages: string[] = (settings as any).languages || [];
  const education: string = (settings as any).education || "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Bio Section */}
      <div className="lg:col-span-2 space-y-8">
        <div className="glass-card p-8 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
          {/* Color accent top bar */}
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: themeColor }} />
          <h2 className={`text-3xl font-bold mb-6 ${fontClass}`}>
            {isPublishingHouse ? "عن الناشر" : "رحلة المؤلف"}
          </h2>

          <div className="prose prose-invert max-w-none text-lg leading-relaxed text-gray-300">
            {user.bio ? (
              user.bio.split("\n").map((paragraph: string, i: number) => (
                <p key={i} className="mb-4">{paragraph}</p>
              ))
            ) : (
              <p className="text-gray-400 italic">
                مرحباً بك في المتجر الرسمي. استكشف العوالم والشخصيات والقصص المصنوعة بشغف. انضم إلى المجتمع للحصول على تحديثات حصرية ومحتوى من وراء الكواليس.
              </p>
            )}
          </div>
        </div>

        {/* Mission / Vision — Publishing Houses only */}
        {isPublishingHouse && (
          <div className="glass-card p-8 rounded-3xl border border-white/5 shadow-xl bg-gradient-to-br from-background to-primary/5">
            <h3 className={`text-2xl font-bold mb-4 ${fontClass}`}>مهمتنا</h3>
            <p className="text-lg text-gray-300 italic">
              "{(settings as any).mission || 'اكتشاف الأصوات التي تتردد عبر الأبدية، وجمعها في قصص تتجاوز الزمان والمكان.'}"
            </p>
          </div>
        )}

        {/* Published Authors — Publishing Houses only */}
        {isPublishingHouse && settings.publishedAuthors && settings.publishedAuthors.length > 0 && (
          <div className="glass-card p-8 rounded-3xl border border-white/5 shadow-xl">
            <h3 className={`text-2xl font-bold mb-6 ${fontClass}`}>مؤلفونا</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {settings.publishedAuthors.map((author) => (
                <div key={author.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <img src={author.avatarUrl} alt={author.name} className="w-10 h-10 rounded-full object-cover" />
                  <span className="font-medium text-white text-sm">{author.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Social & Contact */}
        {(settings.socialLinks?.length || user.email) && (
          <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" style={{ color: themeColor }} /> تواصل
            </h3>
            <div className="flex flex-col gap-3">
              {settings.socialLinks?.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span style={{ color: themeColor }}>
                    {PLATFORM_ICONS[link.platform.toLowerCase()] || <Globe className="w-5 h-5" />}
                  </span>
                  <span className="capitalize text-white">{link.platform}</span>
                </a>
              ))}
              {user.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors mt-2"
                  style={{ color: themeColor }}
                >
                  <Mail className="w-5 h-5" />
                  <span>استفسارات الأعمال</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Credentials */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: themeColor }} /> المؤهلات
          </h3>
          <ul className="space-y-4">
            {genres.length > 0 && (
              <li className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">التصنيفات</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {genres.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs bg-white/10 text-gray-300">{g}</Badge>
                    ))}
                  </div>
                </div>
              </li>
            )}
            {languages.length > 0 && (
              <li className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">اللغات</p>
                  <p className="text-sm text-gray-400">{languages.join(", ")}</p>
                </div>
              </li>
            )}
            {education && !isPublishingHouse && (
              <li className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">التعليم</p>
                  <p className="text-sm text-gray-400">{education}</p>
                </div>
              </li>
            )}
            {genres.length === 0 && languages.length === 0 && !education && (
              <p className="text-sm text-gray-500 italic">لم تتم إضافة أي مؤهلات بعد.</p>
            )}
          </ul>
        </div>

        {/* Team Members — Publishing Houses */}
        {isPublishingHouse && settings.teamMembers && settings.teamMembers.length > 0 && (
          <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-4">فريقنا</h3>
            <div className="space-y-3">
              {settings.teamMembers.map((member, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-white text-sm">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
