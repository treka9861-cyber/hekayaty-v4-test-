import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "كلمتا المرور غير متطابقتين",
        path: ["confirmPassword"],
    });

export default function ResetPassword() {
    const { t } = useTranslation();
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [sessionCheck, setSessionCheck] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                console.log("No active session found immediately on mount. Checking async...");
            }
            setSessionCheck(false);
        };
        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Reset Password Auth State Change:", event);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: z.infer<typeof resetPasswordSchema>) => {
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) throw error;

            setIsSuccess(true);
            toast({
                title: t('resetPassword.successTitle'),
                description: t('resetPassword.successDesc'),
            });

            setTimeout(() => {
                setLocation("/auth");
            }, 3000);

        } catch (err: any) {
            console.error("Update Password Error:", err);
            toast({
                title: t('common.error'),
                description: err.message || t('common.error'),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <Card className="w-full max-w-md border-border/50 shadow-xl">
                        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold">{t('resetPassword.successTitle')}</h2>
                            <p className="text-muted-foreground">
                                {t('resetPassword.successDesc')}
                            </p>
                            <Button asChild className="mt-4">
                                <Link href="/auth">{t('resetPassword.goToLogin')}</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-border/50 shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-serif font-bold text-center">
                            {t('resetPassword.title')}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {t('resetPassword.subtitle')}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t('resetPassword.minLength')}
                                        className="pl-10 pr-10"
                                        {...form.register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {form.formState.errors.password && (
                                    <p className="text-sm text-red-500">{t('resetPassword.minLength')}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder={t('resetPassword.confirmPassword')}
                                        className="pl-10 pr-10"
                                        {...form.register("confirmPassword")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {form.formState.errors.confirmPassword && (
                                    <p className="text-sm text-red-500">{t('resetPassword.mismatch')}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('resetPassword.updating')}
                                    </>
                                ) : (
                                    t('resetPassword.button')
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
