import { useState } from "react";
import { useAdminSettings, useAdminUpdateSettings } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Settings, ShieldAlert, Globe } from "lucide-react";

export function SettingsAdmin() {
    const { data: settings, isLoading } = useAdminSettings();
    const updateSettings = useAdminUpdateSettings();

    const [localSettings, setLocalSettings] = useState<Record<string, any>>({});

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const getSettingValue = (key: string, defaultValue: any) => {
        if (localSettings[key] !== undefined) return localSettings[key];
        const setting = settings?.find((s: any) => s.key === key);
        return setting ? setting.value : defaultValue;
    };

    const handleSave = (key: string) => {
        updateSettings.mutate({ key, value: getSettingValue(key, "") });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold font-serif">Platform Settings</h2>
                    <p className="text-muted-foreground">Manage global configurations and dynamic toggles.</p>
                </div>
            </div>

            <Card className="glass-card border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        Critical Operations
                    </CardTitle>
                    <CardDescription>System-wide switches that affect all users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="space-y-1">
                            <Label className="text-base font-bold text-foreground">Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">Disables public access to the platform (admins only).</p>
                        </div>
                        <Switch 
                            checked={getSettingValue('maintenance_mode', false)}
                            onCheckedChange={(val) => {
                                setLocalSettings(prev => ({...prev, maintenance_mode: val}));
                                updateSettings.mutate({ key: 'maintenance_mode', value: val });
                            }}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="space-y-1">
                            <Label className="text-base font-bold text-foreground">Allow New Registrations</Label>
                            <p className="text-sm text-muted-foreground">Toggle whether new users can sign up.</p>
                        </div>
                        <Switch 
                            checked={getSettingValue('allow_registrations', true)}
                            onCheckedChange={(val) => {
                                setLocalSettings(prev => ({...prev, allow_registrations: val}));
                                updateSettings.mutate({ key: 'allow_registrations', value: val });
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Global Display Settings
                    </CardTitle>
                    <CardDescription>Configure public-facing text and banners.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Platform Name</Label>
                        <div className="flex gap-3">
                            <Input 
                                value={getSettingValue('platform_name', 'Hekayaty')}
                                onChange={(e) => setLocalSettings(prev => ({...prev, platform_name: e.target.value}))}
                                className="bg-white/5 border-white/10"
                            />
                            <Button onClick={() => handleSave('platform_name')} disabled={updateSettings.isPending} className="bg-primary text-primary-foreground gap-2">
                                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Global Announcement Banner (HTML allowed)</Label>
                        <div className="flex gap-3">
                            <Input 
                                value={getSettingValue('global_banner', '')}
                                onChange={(e) => setLocalSettings(prev => ({...prev, global_banner: e.target.value}))}
                                placeholder="E.g. <strong>Sale!</strong> 50% off all subscriptions this weekend."
                                className="bg-white/5 border-white/10"
                            />
                            <Button onClick={() => handleSave('global_banner')} disabled={updateSettings.isPending} className="bg-primary text-primary-foreground gap-2">
                                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Leave empty to hide the banner.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
