import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2, Globe } from "lucide-react";
import { useUserById, useUpdateUser } from "@/hooks/use-users";
import { Textarea } from "@/components/ui/textarea";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useShippingRates, useCreateShippingRate, useDeleteShippingRate } from "@/hooks/use-shipping";

const formSchema = z.object({
    regionName: z.string().min(1, "المنطقة مطلوبة"),
    amount: z.coerce.number().min(0, "التكلفة يجب أن تكون موجبة"),
    deliveryTimeMin: z.coerce.number().min(1, "الحد الأدنى للأيام يجب أن يكون 1 فأكثر"),
    deliveryTimeMax: z.coerce.number().min(1, "الحد الأقصى للأيام يجب أن يكون 1 فأكثر"),
});

const EGYPT_REGIONS = [
    "القاهرة الكبرى",
    "الإسكندرية",
    "الدلتا",
    "مدن القناة",
    "صعيد مصر",
    "البحر الأحمر",
    "سيناء",
    "جميع أنحاء مصر",
    "دولي"
];

export function ShippingSettings({ userId }: { userId: string }) {
    const { data: rates, isLoading } = useShippingRates(userId);
    const createRate = useCreateShippingRate();
    const deleteRate = useDeleteShippingRate();

    const { data: user } = useUserById(userId);
    const updateUser = useUpdateUser();
    const [policyText, setPolicyText] = useState("");

    // Update internal state when user data loads
    useEffect(() => {
        if (user?.shippingPolicy) setPolicyText(user.shippingPolicy);
    }, [user?.shippingPolicy]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            regionName: "",
            amount: 0,
            deliveryTimeMin: 3,
            deliveryTimeMax: 5,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        createRate.mutate({
            creatorId: userId,
            ...values,
            amount: values.amount, // Directly in EGP
        }, {
            onSuccess: () => {
                form.reset({
                    regionName: "",
                    amount: 0,
                    deliveryTimeMin: 3,
                    deliveryTimeMax: 5,
                });
            }
        });
    }

    function handleDelete(id: number) {
        if (confirm("هل أنت متأكد من رغبتك في حذف سعر الشحن هذا؟")) {
            deleteRate.mutate({ id, creatorId: userId });
        }
    }

    function handleSavePolicy() {
        updateUser.mutate({ shippingPolicy: policyText });
    }

    return (
        <div className="space-y-8">
            <Card className="border-primary/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-serif text-primary flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        وصف تغطية التوصيل
                    </CardTitle>
                    <CardDescription>
                        اكتب الأماكن التي يمكنك الشحن إليها، أو أي ملاحظات توصيل محددة للمشترين.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="مثال: نشحن إلى جميع أنحاء القاهرة والجيزة والإسكندرية. يمكن ترتيب الشحن لمناطق محددة في الصعيد عبر الرسائل."
                        className="min-h-[120px] bg-white/5 border-white/10"
                        value={policyText}
                        onChange={(e) => setPolicyText(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSavePolicy}
                            disabled={updateUser.isPending}
                            className="bg-primary text-white"
                        >
                            {updateUser.isPending ? "جاري الحفظ..." : "حفظ وصف التوصيل"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-amber-200/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-cinzel text-amber-500">إضافة سعر شحن</CardTitle>
                    <CardDescription className="text-amber-200/60">
                        حدد تكاليف الشحن لمناطق مختلفة. سيتم حسابها عند الدفع.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="regionName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>اسم المنطقة / المدينة</FormLabel>
                                            <FormControl>
                                                <div className="space-y-2">
                                                    <Input
                                                        placeholder="مثال: مدينة نصر أو الجيزة"
                                                        {...field}
                                                        list="egypt-regions"
                                                    />
                                                    <datalist id="egypt-regions">
                                                        {EGYPT_REGIONS.map(r => <option key={r} value={r} />)}
                                                    </datalist>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>التكلفة (ج.م)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.5" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="deliveryTimeMin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الحد الأدنى للأيام</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="deliveryTimeMax"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الحد الأقصى للأيام</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                                disabled={createRate.isPending}
                            >
                                {createRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                إضافه السعر
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="border-amber-200/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-cinzel text-amber-500">الأسعار الحالية</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        </div>
                    ) : rates && rates.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-amber-200/20 hover:bg-transparent">
                                    <TableHead className="text-amber-500">المنطقة</TableHead>
                                    <TableHead className="text-amber-500">التكلفة</TableHead>
                                    <TableHead className="text-amber-500">التوصيل</TableHead>
                                    <TableHead className="text-right text-amber-500">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rates.map((rate) => (
                                    <TableRow key={rate.id} className="border-amber-200/20 hover:bg-amber-500/10">
                                        <TableCell className="font-medium">{rate.regionName}</TableCell>
                                        <TableCell>{rate.amount} EGP</TableCell>
                                        <TableCell>{rate.deliveryTimeMin}-{rate.deliveryTimeMax} أيام</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(rate.id)}
                                                disabled={deleteRate.isPending}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-muted-foreground p-4">
                            لم يتم تحديد أسعار شحن بعد. قد تُطبق الأسعار الافتراضية إذا كنت تعتمد على إعدادات المنصة الافتراضية.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
