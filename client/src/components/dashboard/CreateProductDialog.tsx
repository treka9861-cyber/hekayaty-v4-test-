import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import { extractTextFromFile } from "@/lib/text-extractor";
import { CloudinaryUpload } from "@/components/ui/cloudinary-upload";
import { CloudinaryGalleryUpload } from "@/components/ui/cloudinary-gallery-upload";
import { Plus, Headphones, PenTool, CheckCircle2, Layout, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const createSchema = insertProductSchema.extend({
  price: z.coerce.number(),
  writerId: z.string(), // UUID string from Supabase
  type: z.enum(["ebook", "physical", "asset", "bundle", "promotional", "merchandise", "audiobook"]),
  licenseType: z.enum(["personal", "commercial", "standard", "extended"]).optional(),
  content: z.string().optional(), // For extracted ebook text
  stockQuantity: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  requiresShipping: z.boolean().optional(),
  productImages: z.array(z.string()).optional(),
  audioDuration: z.coerce.number().optional(),
  audioPreviewUrl: z.string().optional(),
  salePrice: z.coerce.number().optional(),
});

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: any;
  mode?: 'create' | 'edit';
  trigger?: React.ReactNode;
}

export function CreateProductDialog({ open, onOpenChange, product, mode = 'create', trigger }: CreateProductDialogProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { user } = useAuth();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [isFree, setIsFree] = useState(product?.price === 0);
  const [showImmersiveEditor, setShowImmersiveEditor] = useState(false);

  type CreateProductFormValues = z.infer<typeof createSchema>;
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: mode === 'edit' && product ? {
      writerId: product.writerId,
      title: product.title,
      description: product.description,
      coverUrl: product.coverUrl,
      fileUrl: product.fileUrl,
      type: product.type,
      genre: product.genre,
      isPublished: product.isPublished,
      price: product.price,
      licenseType: product.licenseType,
      stockQuantity: product.stockQuantity,
      weight: product.weight,
      requiresShipping: product.requiresShipping,
      merchandiseCategory: product.merchandiseCategory,
      customFields: product.customFields,
      productImages: product.productImages,
      discountPercentage: product.discountPercentage || 0,
      salePrice: product.salePrice,
    } : {
      writerId: user?.id,
      type: "ebook",
      isPublished: true,
      price: 50,
      licenseType: "personal",
    }
  });

  const type = watch("type");
  const price = watch("price");


  useEffect(() => {
    if (mode === 'edit' && product) {
      setIsFree(product.price === 0);
      reset({
        writerId: product.writerId,
        title: product.title,
        description: product.description,
        coverUrl: product.coverUrl,
        fileUrl: product.fileUrl,
        type: product.type,
        genre: product.genre,
        isPublished: product.isPublished,
        price: product.price,
        licenseType: product.licenseType,
        stockQuantity: product.stockQuantity,
        weight: product.weight,
        requiresShipping: product.requiresShipping,
        merchandiseCategory: product.merchandiseCategory,
        customFields: product.customFields,
        productImages: product.productImages,
        salePrice: product.salePrice,
      });
    }
  }, [product, mode, reset]);

  const performSubmit = (data: any, isPublished: boolean) => {
    const finalData = { ...data, isPublished };
    if (finalData.type === 'promotional') {
      finalData.price = 0;
    }

    finalData.salePrice = null;

    if (mode === 'edit' && product) {
      updateProduct.mutate({ id: product.id, ...finalData }, {
        onSuccess: () => {
          onOpenChange(false);
        }
      });
    } else {
      createProduct.mutate(finalData, {
        onSuccess: (newProduct) => {
          reset();
          onOpenChange(false);
          if (newProduct.type === 'ebook') {
            window.location.href = `/studio/${newProduct.id}`;
          }
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : mode === 'create' ? (
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" /> {t("dashboard.products.createNew")}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? t("dashboard.products.editTitle") || "تعديل المنتج" : t("dashboard.products.publishTitle")}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? t("dashboard.products.editDescription") || "قم بتحديث تفاصيل منتجك أدناه." : t("dashboard.products.publishDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => performSubmit(data, true))} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <select
                {...register("type")}
                className="w-full p-2 rounded-md border bg-background"
                onChange={(e) => {
                  const val = e.target.value;
                  setValue("type", val as any);
                  if (val === "physical" || val === "merchandise") {
                    setValue("requiresShipping", true);
                  }
                }}
              >
                <option value="ebook">{t("dashboard.products.types.ebook")}</option>
                <option value="audiobook">{t("dashboard.products.types.audiobook") || "كتاب صوتي"}</option>
                <option value="physical">{t("dashboard.products.types.physical")}</option>
                <option value="merchandise">{t("dashboard.products.types.merchandise")}</option>
                <option value="asset">{t("dashboard.products.types.asset")}</option>
                <option value="promotional">{t("dashboard.products.types.promotional")}</option>
              </select>
            </div>

            {type === "merchandise" && (
              <div className="col-span-2 space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("dashboard.products.category")}</label>
                    <select {...register("merchandiseCategory" as any)} className="w-full p-2 rounded-md border bg-background">
                      <option value="clothing">{t("dashboard.products.categories.clothing")}</option>
                      <option value="accessories">{t("dashboard.products.categories.accessories")}</option>
                      <option value="collectibles">{t("dashboard.products.categories.collectibles")}</option>
                      <option value="other">{t("dashboard.products.categories.other")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("dashboard.products.stock")}</label>
                    <Input type="number" {...register("stockQuantity")} placeholder="e.g. 50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dashboard.products.customization")}</label>
                  <Input {...register("customFields" as any)} placeholder={t("dashboard.products.customizationLabel")} />
                </div>
              </div>
            )}

            {type === "physical" && (
              <div className="col-span-2 grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dashboard.products.stock")}</label>
                  <Input type="number" {...register("stockQuantity")} placeholder="e.g. 50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("dashboard.products.weight")}</label>
                  <Input type="number" step="10" {...register("weight")} placeholder="e.g. 500" />
                </div>
                <div className="flex items-center space-x-2 col-span-2 pt-2">
                  <Checkbox
                    id="ship"
                    defaultChecked={true}
                    onCheckedChange={(c) => setValue("requiresShipping", c as boolean)}
                  />
                  <label htmlFor="ship" className="text-sm font-medium">{t("dashboard.products.requiresShipping")}</label>
                </div>
                <p className="text-[10px] text-amber-500 col-span-2 italic">
                  💡 {t("dashboard.products.shippingNote")}
                </p>
              </div>
            )}

            {type === "audiobook" && (
              <div className="col-span-2 p-10 rounded-3xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-primary/5 border border-primary/20 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-700 shadow-2xl shadow-primary/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 blur-2xl -ml-12 -mb-12" />

                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-primary shadow-inner border border-primary/10 animate-pulse">
                    <Headphones className="w-10 h-10 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-[10px] border-2 border-background animate-bounce">
                    ✨
                  </div>
                </div>

                <div className="space-y-3 relative z-10">
                  <h3 className="text-2xl font-bold font-serif bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent">
                    {t("dashboard.products.echoesComing") || "الهمسات القديمة تستيقظ..."}
                  </h3>
                  <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto leading-relaxed italic">
                    {t("dashboard.products.audioComingVibe") || "يتم سحر مخطوطات الصوت. قريباً جداً، ستتردد أصداء قصصك عبر العوالم في سيمفونية رائعة من الأصوات."}
                  </p>
                </div>
              </div>
            )}

            {type === "ebook" && (
              <div className="col-span-2 space-y-4">
                <div className="space-y-4 p-6 border-2 border-primary/20 border-dashed rounded-2xl bg-primary/5">
                  <div className="flex items-center gap-3 text-primary">
                    <PenTool className="w-6 h-6" />
                    <h4 className="font-bold text-lg">{t("studio.title")}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("dashboard.products.ebookGuide")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {isArabic ? "لا يوجد رفع ملفات - جرب الأمان الحقيقي" : "No file uploads - Experience true security"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      {isArabic ? "حماية من نسخ الـ PDF والسرقة" : "Anti-PDF scraping & theft protection"}
                    </div>
                  </div>
                  <Link href="/studio">
                    <Button type="button" variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary rounded-xl py-6">
                      <Layout className="w-5 h-5 text-primary" />
                      {t("nav.studio")}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">{t("dashboard.products.workTitle")}</label>
              <Input {...register("title")} className="h-12 text-lg" placeholder={t("dashboard.products.workTitlePlaceholder")} />
              {errors.title && <p className="text-red-500 text-xs">{String(errors.title.message)}</p>}
            </div>



            {type !== "promotional" && (
              <>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">{t("dashboard.products.price")}</label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      {...register("price", { valueAsNumber: true })}
                      disabled={isFree}
                      className={cn(
                        "h-14 flex-1 text-2xl font-black border-2 border-amber-500/50 focus:border-amber-500 text-center transition-all bg-amber-500/5",
                        isFree ? "opacity-50" : ""
                      )}
                    />
                    <div className="flex items-center space-x-2 shrink-0">
                      <Checkbox
                        id="free-product"
                        checked={isFree}
                        onCheckedChange={(checked) => {
                          setIsFree(checked as boolean);
                          if (checked) {
                            setValue("price", 0);
                          } else {
                            setValue("price", 50);
                          }
                        }}
                      />
                      <label htmlFor="free-product" className="text-sm font-medium leading-none cursor-pointer">
                        {t("dashboard.products.free")}
                      </label>
                    </div>
                  </div>
                </div>


              </>
            )}

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">{t("dashboard.products.genre")}</label>
              <Input {...register("genre")} className="h-14 text-lg font-bold text-center" placeholder={type === "asset" ? "أيقونات، خامات..." : t("dashboard.products.genrePlaceholder")} />
            </div>

            <div className="space-y-2 col-span-2">
              <CloudinaryUpload
                label={t("dashboard.products.cover")}
                aspectRatio="square"
                folder="hekayaty_covers"
                onUpload={(url) => setValue("coverUrl", url)}
              />
              <Input type="hidden" {...register("coverUrl")} />
              {errors.coverUrl && <p className="text-red-500 text-xs">{String(errors.coverUrl.message)}</p>}
            </div>

            {type === "merchandise" && (
              <div className="space-y-2 col-span-2 border-t pt-4">
                <CloudinaryGalleryUpload
                  label={t("dashboard.products.gallery")}
                  onUpload={(urls) => setValue("productImages", urls)}
                />
                <Input type="hidden" {...register("productImages" as any)} />
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">{t("dashboard.products.description")}</label>
              <Textarea {...register("description")} className="h-32" placeholder={t("dashboard.products.descriptionPlaceholder")} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createProduct.isPending || updateProduct.isPending}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20"
            >
              {(createProduct.isPending || updateProduct.isPending) ? t("common.processing") : mode === 'edit' ? t("common.save") : t("dashboard.products.publishItem")}
            </Button>
          </div>
        </form>

        {showImmersiveEditor && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setShowImmersiveEditor(false)}>
                  <ChevronLeft className="w-5 h-5 mr-1" /> {t("dashboard.studio_overlay.back")}
                </Button>
                <h2 className="text-xl font-serif font-bold italic text-primary">{t("dashboard.studio_overlay.title")}</h2>
              </div>
              <Button onClick={() => setShowImmersiveEditor(false)} className="bg-primary text-white font-bold">
                {t("dashboard.studio_overlay.save")}
              </Button>
            </div>
            <div className="flex-grow flex justify-center overflow-hidden">
              <div className="w-full max-w-4xl h-full p-8 md:p-12">
                <Textarea
                  value={watch("content")}
                  onChange={(e) => setValue("content", e.target.value)}
                  placeholder={t("dashboard.studio_overlay.placeholder")}
                  className="w-full h-full text-xl md:text-2xl font-serif leading-relaxed resize-none p-12 bg-card border-none focus-visible:ring-0 shadow-2xl rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
