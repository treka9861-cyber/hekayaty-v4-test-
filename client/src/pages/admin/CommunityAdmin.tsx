import { useAdminChatModeration, useAdminDeleteChatMessage } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Trash2, ShieldAlert, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function CommunityAdmin() {
    const { data: messages, isLoading } = useAdminChatModeration();
    const deleteMessage = useAdminDeleteChatMessage();

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold font-serif">Community Moderation</h2>
                    <p className="text-muted-foreground">Manage global chat flags and community health.</p>
                </div>
            </div>

            <Card className="glass-card border-white/10 bg-black/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        Flagged Chat Messages
                    </CardTitle>
                    <CardDescription>Review messages flagged by the auto-moderator or users in the Global Chat.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {(!messages || messages.length === 0) ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <CheckCircle className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                            <p className="text-lg font-medium">Chat is clean!</p>
                            <p className="text-sm">No flagged messages in the queue.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs">Date</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs">User ID</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs">Message</TableHead>
                                    <TableHead className="text-primary/70 font-bold uppercase text-xs text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {messages.map((msg: any) => (
                                    <TableRow key={msg.id} className="border-white/5 hover:bg-white/5">
                                        <TableCell className="py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                            {formatDate(msg.created_at)}
                                        </TableCell>
                                        <TableCell className="py-4 font-mono text-xs">
                                            {msg.user_id.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <p className="text-sm font-medium text-red-200 bg-red-500/10 p-3 rounded border border-red-500/20">
                                                {msg.message}
                                            </p>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm("Delete this message?")) deleteMessage.mutate(msg.id);
                                                }}
                                                disabled={deleteMessage.isPending}
                                                className="gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
