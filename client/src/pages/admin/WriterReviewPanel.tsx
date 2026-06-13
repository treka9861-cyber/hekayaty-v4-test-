import { useAdminWriterReviewData, useAdminVerifyWriter } from "@/hooks/use-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2, BadgeCheck, ShieldOff, ShieldCheck, Star, Users, BookOpen,
    Layers, DollarSign, Flag, Calendar, TrendingUp, MessageSquare, Activity, AlertTriangle
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { useState } from "react";

function StatCard({ icon: Icon, label, value, color = "text-primary" }: {
    icon: any; label: string; value: string | number; color?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1 p-3 bg-white/5 rounded-xl border border-white/5">
            <Icon className={cn("w-5 h-5 mb-1", color)} />
            <span className="text-lg font-black text-foreground">{value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
    );
}

interface WriterReviewPanelProps {
    writerId: string | null;
    onClose: () => void;
}

export function WriterReviewPanel({ writerId, onClose }: WriterReviewPanelProps) {
    const { data, isLoading } = useAdminWriterReviewData(writerId);
    const verifyWriter = useAdminVerifyWriter();
    const [notes, setNotes] = useState("");

    const user = data?.user;
    const stats = data?.stats;

    function handleVerify(isVerified: boolean) {
        if (!writerId) return;
        verifyWriter.mutate(
            { userId: writerId, isVerified, verificationNotes: notes || undefined },
            { onSuccess: onClose }
        );
    }

    return (
        <Dialog open={!!writerId} onOpenChange={onClose}>
            <DialogContent className="bg-[#0a0a0f] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : !user ? (
                    <div className="text-center p-10 text-muted-foreground">Writer not found.</div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3 text-xl">
                                <img
                                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name)}&background=1a1a1a&color=cca660`}
                                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                                    alt=""
                                />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black">{user.display_name}</span>
                                        {user.is_verified && (
                                            <BadgeCheck className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono font-normal">@{user.username} · {user.role}</p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        {/* Writer Info */}
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <Badge className="bg-white/5 border-white/10 text-muted-foreground gap-1">
                                    <Calendar className="w-3 h-3" /> Joined {formatDate(user.created_at)}
                                </Badge>
                                <Badge className={cn("border font-bold", user.is_verified
                                    ? "bg-primary/15 text-primary border-primary/30"
                                    : "bg-white/5 border-white/10 text-muted-foreground"
                                )}>
                                    {user.is_verified ? "✓ Verified" : "Not Verified"}
                                </Badge>
                                <Badge className="bg-white/5 border-white/10 text-muted-foreground capitalize">
                                    {user.subscription_tier || "free"} plan
                                </Badge>
                                <Badge className={cn("border font-bold capitalize", {
                                    "bg-green-500/10 text-green-400 border-green-500/20": user.status === "active",
                                    "bg-red-500/10 text-red-400 border-red-500/20": user.status === "banned",
                                    "bg-amber-500/10 text-amber-400 border-amber-500/20": user.status === "suspended",
                                })}>
                                    {user.status || "active"}
                                </Badge>
                            </div>

                            {user.bio && (
                                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">{user.bio}</p>
                            )}

                            {/* Stats Grid */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5" /> Performance Statistics
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    <StatCard icon={BookOpen} label="Stories" value={stats?.storyCount || 0} />
                                    <StatCard icon={Layers} label="Chapters" value={stats?.chapterCount || 0} />
                                    <StatCard icon={Users} label="Followers" value={stats?.followersCount || 0} color="text-blue-400" />
                                    <StatCard icon={Star} label="Avg Rating" value={stats?.avgRating || 0} color="text-amber-400" />
                                    <StatCard icon={MessageSquare} label="Reviews" value={stats?.totalReviews || 0} color="text-purple-400" />
                                    <StatCard icon={TrendingUp} label="Total Sales" value={stats?.totalSales || 0} color="text-emerald-400" />
                                    <StatCard icon={DollarSign} label="Revenue" value={`$${((stats?.totalEarnings || 0) / 100).toFixed(2)}`} color="text-emerald-400" />
                                    <StatCard icon={BookOpen} label="Published" value={stats?.publishedCount || 0} color="text-cyan-400" />
                                    <StatCard icon={Flag} label="Reports" value={stats?.reportsCount || 0} color={stats?.reportsCount > 0 ? "text-red-400" : "text-muted-foreground"} />
                                </div>
                            </div>

                            {/* Recent Stories */}
                            {data?.products?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5" /> Recent Stories
                                    </h3>
                                    <div className="space-y-2">
                                        {data.products.slice(0, 5).map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm">
                                                <span className="font-medium truncate max-w-[60%]">{p.title}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-amber-400">★ {p.rating || 0}</span>
                                                    <span className="text-xs text-muted-foreground">{p.sales_count || 0} sales</span>
                                                    <Badge className={cn("text-[9px]", p.is_published ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground")}>
                                                        {p.is_published ? "Published" : "Draft"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reports */}
                            {data?.reports?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> User Reports ({data.reports.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {data.reports.map((r: any, i: number) => (
                                            <div key={r.id || i} className="flex items-center justify-between p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-sm">
                                                <span className="text-red-200">{r.reason}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px]">{r.status}</Badge>
                                                    <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Audit History */}
                            {data?.auditHistory?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5" /> Verification History
                                    </h3>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {data.auditHistory
                                            .filter((a: any) => a.action === 'verify_writer' || a.action === 'unverify_writer')
                                            .map((a: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground p-2 bg-white/5 rounded">
                                                    <BadgeCheck className={cn("w-3.5 h-3.5 shrink-0", a.action === 'verify_writer' ? "text-primary" : "text-red-400")} />
                                                    <span className="capitalize">{a.action.replace(/_/g, ' ')}</span>
                                                    {a.details && <span className="italic truncate opacity-60">{a.details}</span>}
                                                    <span className="ml-auto shrink-0">{formatDate(a.created_at)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Verification Notes + Action */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Verification Action
                                </h3>
                                <Textarea
                                    placeholder="Internal notes for this decision (optional)..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="bg-white/5 border-white/10 resize-none h-20 text-sm"
                                />
                                <div className="flex gap-3">
                                    {!user.is_verified ? (
                                        <Button
                                            onClick={() => handleVerify(true)}
                                            disabled={verifyWriter.isPending}
                                            className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground font-bold gap-2"
                                        >
                                            {verifyWriter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                            Grant Verification
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleVerify(false)}
                                            disabled={verifyWriter.isPending}
                                            variant="destructive"
                                            className="flex-1 font-bold gap-2"
                                        >
                                            {verifyWriter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                                            Remove Verification
                                        </Button>
                                    )}
                                    <Button variant="ghost" onClick={onClose} className="flex-1">Close</Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
