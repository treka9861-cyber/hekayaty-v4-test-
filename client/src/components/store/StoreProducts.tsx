import { StoreProps } from "./types";
import { Product } from "@shared/schema";
import { ProductCard } from "@/components/ProductCard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSort } from "@/hooks/use-sort";
import { SortSelector } from "@/components/SortSelector";
import { LazySection } from "@/lib/performance-core";

interface StoreProductsProps extends StoreProps {
  products: Product[];
}

export function StoreProducts({ products, themeColor }: StoreProductsProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom mock filtering logic to simulate the advanced UI requested
  const formats = ["all", "ebook", "physical", "audiobook", "bundle", "merchandise"];

  const filteredProducts = products.filter(p => {
    // Format filter
    if (filter !== "all" && p.type !== filter) {
      if (filter === "ebook" && p.type !== "ebook") return false;
      if (filter === "physical" && p.type !== "physical") return false;
      // Note: mapping actual DB types to UI filters
    }
    // Search filter
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const { sortBy, setSortBy, sortedItems } = useSort<Product>(filteredProducts);

  return (
    <div className="space-y-8">
      {/* Filters & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-30 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {formats.map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "ghost"}
              className={`rounded-full capitalize shrink-0 ${filter === f ? 'shadow-lg' : 'hover:bg-white/5'}`}
              style={filter === f ? { backgroundColor: themeColor } : {}}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'جميع الأعمال' : f}
            </Button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4 items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="ابحث عن العناوين..." 
              className="pl-9 bg-black/20 border-white/10 focus-visible:ring-1"
              style={{ '--tw-ring-color': themeColor } as any}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <SortSelector value={sortBy} onValueChange={setSortBy} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sortedItems.map((product) => (
          <LazySection key={product.id} offset="400px" fallback={<div className="h-[400px] rounded-[20px] bg-white/5 animate-pulse" />}>
            <ProductCard product={product} />
          </LazySection>
        ))}
      </div>

      {sortedItems.length === 0 && (
        <div className="py-20 text-center glass-card rounded-3xl border border-dashed border-white/10">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2 text-white">لم يتم العثور على منتجات</h3>
          <p className="text-gray-400">حاول تعديل فلاتر البحث أو استعلام البحث.</p>
        </div>
      )}
    </div>
  );
}
