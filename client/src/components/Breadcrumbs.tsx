import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <nav className={cn("flex mb-6 overflow-x-auto pb-2 scrollbar-hide", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 rtl:space-x-reverse whitespace-nowrap">
        <li>
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span className="sr-only">{t("nav.home", "الرئيسية")}</span>
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground/40 mx-1", isArabic && "rotate-180")} />
            {item.href && !item.current ? (
              <Link href={item.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-bold text-primary truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
