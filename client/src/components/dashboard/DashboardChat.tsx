import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    Send,
    Trash2,
    Pin,
    PinOff,
    Reply,
    ChevronDown,
    User,
    Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useChat, ChatMessage } from '@/hooks/use-chat';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

export function DashboardChat() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const {
        messages,
        sendMessage,
        deleteMessage,
        pinMessage,
        isLoading
    } = useChat(user?.id || '');

    const [inputValue, setInputValue] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`dash-msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-primary/10');
            setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !user) return;

        await sendMessage({
            content: inputValue,
            replyToId: replyTo?.id
        });

        setInputValue('');
        setReplyTo(null);
    };

    const pinnedMessage = messages.find(m => m.is_pinned);

    return (
        <div className="flex flex-col h-[700px] glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-serif">{t('chat.dashboard.title', 'بريد رسائل المتجر')}</h2>
                        <p className="text-sm text-muted-foreground">{t('chat.dashboard.subtitle', 'تواصل مع قرائك في الوقت الفعلي')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-500">مباشر</span>
                </div>
            </div>

            {/* Pinned Message Banner */}
            {pinnedMessage && (
                <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                    <Pin className="w-5 h-5 text-primary mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-primary mb-1 uppercase tracking-widest">{t('chat.pinned', 'مثبت للقراء')}</p>
                        <p className="text-sm font-medium">{pinnedMessage.content}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-2"
                        onClick={() => pinMessage({ messageId: pinnedMessage.id, isPinned: false })}
                    >
                        <PinOff className="w-4 h-4" /> {t('chat.actions.unpin', 'إلغاء التثبيت')}
                    </Button>
                </div>
            )}

            <div className="flex-1 relative overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    <div className="space-y-8 max-w-4xl mx-auto">
                        {messages.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                                <MessageCircle className="w-20 h-20 mb-6" />
                                <h3 className="text-xl font-bold mb-2">لا توجد محادثات بعد</h3>
                                <p className="max-w-md">عندما يزور القراء متجرك ويرسلون رسائل، ستظهر هنا في الوقت الفعلي.</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <DashboardMessageItem
                                key={message.id}
                                message={message}
                                isOwn={message.sender_id === user?.id}
                                onReply={() => setReplyTo(message)}
                                onDelete={() => deleteMessage(message.id)}
                                onPin={() => pinMessage({ messageId: message.id, isPinned: true })}
                                onScrollToOriginal={scrollToMessage}
                                currentLocale={currentLocale}
                            />
                        ))}
                    </div>
                </ScrollArea>

                {/* Reply Preview */}
                {replyTo && (
                    <div className="px-6 py-3 bg-primary/5 border-t border-primary/10 flex items-center justify-between text-sm animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 truncate">
                            <Reply className="w-4 h-4 text-primary" />
                            <div className="truncate">
                                <span className="font-bold">رد على {replyTo.sender?.display_name}:</span>
                                <span className="ml-2 opacity-70 italic">{replyTo.content}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-6 bg-white/5 border-t border-white/10">
                    <div className="flex gap-4 max-w-4xl mx-auto">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={t('chat.dashboard.placeholder', 'اكتب رسالة لمجتمعك...')}
                            className="h-14 bg-black/40 border-white/10 px-6 text-lg rounded-xl focus:ring-primary/50"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="lg" className="h-14 w-14 rounded-xl shadow-xl shadow-primary/20" onClick={handleSend} disabled={!inputValue.trim()}>
                            <Send className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardMessageItem({
    message,
    isOwn,
    onReply,
    onDelete,
    onPin,
    onScrollToOriginal,
    currentLocale
}: {
    message: ChatMessage;
    isOwn: boolean;
    onReply: () => void;
    onDelete: () => void;
    onPin: () => void;
    onScrollToOriginal: (id: string) => void;
    currentLocale: any;
}) {
    const { t } = useTranslation();

    return (
        <div id={`dash-msg-${message.id}`} className={cn("group flex gap-4 animate-in fade-in slide-in-from-bottom-4 transition-all duration-500 rounded-2xl p-2", isOwn && "flex-row-reverse")}>
            <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 shadow-lg">
                <AvatarImage src={message.sender?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">{message.sender?.display_name?.[0] || <User className="w-4 h-4" />}</AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col space-y-1", isOwn ? "items-end" : "items-start")}>
                <div className="flex items-center gap-3 px-1">
                    <span className="text-sm font-black text-primary/80 uppercase tracking-tighter">{message.sender?.display_name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: currentLocale })}
                    </span>
                </div>

                {/* Reply Quote */}
                {message.reply_to && (
                    <div
                        onClick={() => onScrollToOriginal(message.reply_to_id!)}
                        className="bg-primary/5 border-l-2 border-primary/30 p-3 text-xs rounded-xl mb-1 opacity-70 w-full italic max-w-md cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                        <p className="font-bold not-italic mb-1 opacity-50">{message.reply_to.sender?.display_name}</p>
                        {message.reply_to.content}
                    </div>
                )}

                <div className="flex items-center gap-2 group/msg">
                    <div className={cn(
                        "px-6 py-3 rounded-2xl text-base shadow-sm relative",
                        isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-card border border-white/10 text-foreground rounded-tl-none"
                    )}>
                        {message.content}
                        {message.is_pinned && !isOwn && (
                            <div className="absolute -top-2 -right-2 bg-primary p-1 rounded-full shadow-lg">
                                <Pin className="w-3 h-3 text-primary-foreground" />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={onReply} title={t('common.reply', 'رد')}>
                            <Reply className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={onPin} title={t('common.pin', 'تثبيت بالمتجر')}>
                            <Pin className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/10 text-destructive" onClick={onDelete} title={t('common.delete', 'حذف')}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { X } from 'lucide-react';
