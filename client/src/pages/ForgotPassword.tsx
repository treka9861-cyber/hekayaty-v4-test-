import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const forgotPasswordSchema = z.object({
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
});

export default function ForgotPassword() {
    const { t } = useTranslation();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                console.error("Supabase Reset Error:", error);
                if (error.status === 429) {
                    setError(t('forgotPassword.rateLimitError'));
                    setIsLoading(false);
                    return;
                }
            }

            setIsSubmitted(true);
        } catch (err) {
            console.error("Reset Password Exception:", err);
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-border/50 shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-serif font-bold text-center">
                            {t('forgotPassword.title')}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {t('forgotPassword.subtitle')}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {isSubmitted ? (
                            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-xl">{t('forgotPassword.successTitle')}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {t('forgotPassword.successDesc', { email: form.getValues("email") })}
                                    </p>
                                    <p className="text-xs text-muted-foreground pt-4">
                                        {t('forgotPassword.spamNote')}
                                    </p>
                                </div>
                                <Button variant="outline" className="w-full mt-4" onClick={() => setIsSubmitted(false)}>
                                    {t('forgotPassword.tryAnother')}
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={t('forgotPassword.emailPlaceholder')}
                                            className="pl-10"
                                            {...form.register("email")}
                                        />
                                    </div>
                                    {form.formState.errors.email && (
                                        <p className="text-sm text-red-500">{t('forgotPassword.emailError')}</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 text-sm bg-red-500/10 text-red-500 rounded-md border border-red-500/20">
                                        {error}
                                    </div>
                                )}

                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('forgotPassword.sending')}
                                        </>
                                    ) : (
                                        t('forgotPassword.sendButton')
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-center border-t p-4 bg-muted/20">
                        <Link href="/auth">
                            <span className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 cursor-pointer transition-colors">
                                <ArrowLeft className="w-4 h-4" /> {t('forgotPassword.backToLogin')}
                            </span>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
