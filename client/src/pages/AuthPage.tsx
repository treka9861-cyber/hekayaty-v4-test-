
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Feather, Loader2, Eye, EyeOff } from "lucide-react";
import { insertUserSchema } from "@shared/schema";

const loginSchema = z.object({
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
    password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const registerSchema = insertUserSchema.pick({
    username: true,
    password: true,
    email: true,
    displayName: true,
    role: true,
}).extend({
    username: z.string().min(3, "يجب أن يتكون اسم المستخدم 3 أحرف على الأقل"),
    password: z.string().min(6, "يجب أن تكون كلمة المرور 6 أحرف على الأقل"),
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
    displayName: z.string().min(2, "يجب أن يتكون الاسم حرفين على الأقل"),
});

export default function AuthPage() {
    const { t } = useTranslation();
    const [location, setLocation] = useLocation();
    const { user, loginMutation, registerMutation } = useAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode") || "login";
    const [activeTab, setActiveTab] = useState(mode === "register" ? "register" : "login");

    useEffect(() => {
        const currentMode = new URLSearchParams(window.location.search).get("mode");
        if (currentMode === "register") setActiveTab("register");
        else if (currentMode === "login") setActiveTab("login");
    }, [window.location.search]);

    useEffect(() => {
        if (user) {
            if (user.role === "writer" || user.role === "artist") {
                setLocation(`/writer/${user.username}`);
            } else {
                setLocation("/dashboard");
            }
        }
    }, [user, setLocation]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <Navbar />
            {/* Left: Decorative */}
            <div className="hidden lg:flex flex-col justify-between bg-[#1a0f0a] text-white p-12 pt-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="bg-gradient-to-tr from-primary to-accent p-2 rounded-lg">
                            <Feather className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-gradient">Hekayaty</h1>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-4xl font-serif font-bold leading-tight">
                            {t('auth.welcome.title')}
                        </h2>
                        <p className="text-lg text-white/80">
                            {t('auth.welcome.subtitle')}
                        </p>
                    </div>
                </div>
                <div className="relative z-10 flex justify-between items-end text-sm text-white/60">
                    <div>{t('auth.welcome.copyright')}</div>
                    <div className="font-medium text-primary">{t('auth.welcome.production')}</div>
                </div>
            </div>

            {/* Right: Forms */}
            <div className="flex items-center justify-center p-6 pt-24 bg-background">
                <div className="w-full max-w-md space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8">
                            <TabsTrigger value="login">{t('nav.login')}</TabsTrigger>
                            <TabsTrigger value="register">{t('auth.register.button')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm />
                        </TabsContent>

                        <TabsContent value="register">
                            <RegisterForm />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

function LoginForm() {
    const { t } = useTranslation();
    const { loginMutation } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = (data: z.infer<typeof loginSchema>) => {
        loginMutation.mutate(data);
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0">
                <CardTitle>{t('auth.login.title')}</CardTitle>
                <CardDescription>{t('auth.login.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('auth.login.email')}</Label>
                        <Input type="email" {...form.register("email")} placeholder={t('auth.login.emailPlaceholder')} />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>{t('auth.login.password')}</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                {...form.register("password")}
                                placeholder={t('auth.login.passwordPlaceholder')}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Link href="/forgot-password">
                            <span className="text-sm text-primary hover:underline cursor-pointer">
                                {t('auth.login.forgotPassword', 'نسيت كلمة المرور؟')}
                            </span>
                        </Link>
                    </div>

                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('auth.login.button')}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        {t('auth.login.noAccount')}{' '}
                        <button type="button" className="text-primary hover:underline" onClick={() => { }}>
                            {t('auth.login.signUp')}
                        </button>
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}

function RegisterForm() {
    const { t } = useTranslation();
    const { registerMutation } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: { role: "reader" }
    });

    const onSubmit = (data: z.infer<typeof registerSchema>) => {
        registerMutation.mutate({
            email: data.email,
            password: data.password,
            username: data.username,
            displayName: data.displayName,
            role: (data.role || 'reader') as 'reader' | 'writer' | 'artist'
        });
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0">
                <CardTitle>{t('auth.register.title')}</CardTitle>
                <CardDescription>{t('auth.register.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('auth.register.email')}</Label>
                        <Input type="email" {...form.register("email")} placeholder={t('auth.register.emailPlaceholder')} />
                        {form.formState.errors.email && (
                            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('auth.register.username')}</Label>
                        <Input {...form.register("username")} placeholder={t('auth.register.usernamePlaceholder')} />
                        {form.formState.errors.username && (
                            <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('auth.register.displayName')}</Label>
                        <Input {...form.register("displayName")} placeholder={t('auth.register.displayNamePlaceholder')} />
                        {form.formState.errors.displayName && (
                            <p className="text-sm text-red-500">{form.formState.errors.displayName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('auth.register.password')}</Label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                {...form.register("password")}
                                placeholder={t('auth.register.passwordPlaceholder')}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('auth.register.role')}</Label>
                        <RadioGroup
                            defaultValue="reader"
                            onValueChange={(val) => form.setValue("role", val as any)}
                            className="grid grid-cols-3 gap-4"
                        >
                            {(['reader', 'writer', 'artist'] as const).map((role) => (
                                <div key={role}>
                                    <RadioGroupItem value={role} id={role} className="peer sr-only" />
                                    <Label
                                        htmlFor={role}
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                        {t(`auth.register.${role}`)}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('auth.register.button')}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        {t('auth.register.haveAccount')}{' '}
                        <span className="text-primary hover:underline cursor-pointer">
                            {t('auth.register.logIn')}
                        </span>
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
