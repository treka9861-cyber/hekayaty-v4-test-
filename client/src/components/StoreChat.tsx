import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    Send,
    X,
    Trash2,
    Pin,
    PinOff,
    Reply,
    Smile,
    MoreVertical,
    ChevronDown
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
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

interface StoreChatProps {
    storeId: string;
    storeName: string;
}

export function StoreChat({ storeId, storeName }: StoreChatProps) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const {
        messages,
        sendMessage,
        deleteMessage,
        pinMessage,
        isLoading
    } = useChat(storeId);

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isOwner = user?.id === storeId;
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isOpen]);

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`msg-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-primary/20');
            setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
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
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="secondary"
                    size="lg"
                    className="fixed bottom-6 right-6 z-50 rounded-full shadow-2xl gap-2 h-14 px-6 border border-primary/20 backdrop-blur-md bg-background/80 hover:bg-background/90 transition-all hover:scale-105"
                >
                    <MessageCircle className="w-6 h-6 text-primary animate-pulse" />
                    <span className="font-bold">{t('chat.button', '💬 Store Chat')}</span>
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col glass-card border-l border-white/10">
                <SheetHeader className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            <span>{t('chat.title', 'محادثة المتجر')}</span>
                            <span className="text-xs font-normal text-muted-foreground">/ {storeName}</span>
                        </SheetTitle>
                    </div>
                </SheetHeader>

                {/* Pinned Message */}
                {pinnedMessage && (
                    <div className="bg-primary/10 p-3 border-b border-primary/20 flex items-start gap-3 relative animate-in fade-in slide-in-from-top-2">
                        <Pin className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{t('chat.pinned', 'رسالة مثبتة')}</p>
                            <p className="text-sm line-clamp-2">{pinnedMessage.content}</p>
                        </div>
                        {isOwner && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => pinMessage({ messageId: pinnedMessage.id, isPinned: false })}
                            >
                                <PinOff className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                )}

                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-6">
                        {messages.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <MessageCircle className="w-12 h-12 mb-4" />
                                <p className="text-sm">{t('chat.empty', 'لا توجد رسائل بعد. ابدأ المحادثة!')}</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                isOwn={message.sender_id === user?.id}
                                isOwner={isOwner}
                                onReply={() => setReplyTo(message)}
                                onDelete={() => deleteMessage(message.id)}
                                onPin={() => pinMessage({ messageId: message.id, isPinned: true })}
                                onScrollToOriginal={scrollToMessage}
                                currentLocale={currentLocale}
                            />
                        ))}
                    </div>
                </ScrollArea>

                {/* Controls */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    {!user ? (
                        <p className="text-center text-sm text-muted-foreground p-2">
                            {t('chat.guestNote', 'يرجى تسجيل الدخول للمشاركة في المحادثة.')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {replyTo && (
                                <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border-l-2 border-primary text-xs animate-in slide-in-from-bottom-2">
                                    <div className="flex-1 truncate mr-2">
                                        <span className="font-bold text-primary">الرد على {replyTo.sender?.display_name}: </span>
                                        <span className="opacity-70">{replyTo.content}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setReplyTo(null)}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={t('chat.placeholder', 'قل شيئاً سحرياً...')}
                                    className="bg-black/40 border-white/10"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function MessageItem({
    message,
    isOwn,
    isOwner,
    onReply,
    onDelete,
    onPin,
    onScrollToOriginal,
    currentLocale
}: {
    message: ChatMessage;
    isOwn: boolean;
    isOwner: boolean;
    onReply: () => void;
    onDelete: () => void;
    onPin: () => void;
    onScrollToOriginal: (messageId: string) => void;
    currentLocale: any;
}) {
    const { t } = useTranslation();

    return (
        <div id={`msg-${message.id}`} className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 transition-colors duration-500 rounded-lg", isOwn && "flex-row-reverse")}>
            <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                <AvatarImage src={message.sender?.avatar_url || ''} />
                <AvatarFallback>{message.sender?.display_name?.[0] || '?'}</AvatarFallback>
            </Avatar>

            <div className={cn("flex flex-col max-w-[80%]", isOwn ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold opacity-80">{message.sender?.display_name}</span>
                    <span className="text-[10px] opacity-40">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: currentLocale })}
                    </span>
                </div>

                {/* Reply Quote */}
                {message.reply_to && (
                    <div
                        onClick={() => onScrollToOriginal(message.reply_to_id!)}
                        className="bg-black/20 border-l-2 border-primary/50 p-2 text-xs rounded-t-lg mb-[1px] opacity-60 w-full truncate italic cursor-pointer hover:bg-black/30 transition-colors"
                    >
                        {message.reply_to.content}
                    </div>
                )}

                <div className={cn(
                    "px-4 py-2 rounded-2xl text-sm relative group",
                    isOwn
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none border border-white/5"
                )}>
                    {message.content}

                    {/* Actions Popover Trigger or Hover Actions */}
                    <div className={cn(
                        "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isOwn ? "right-full mr-2" : "left-full ml-2"
                    )}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                                <DropdownMenuItem onClick={onReply} className="gap-2">
                                    <Reply className="w-4 h-4" /> {t('chat.actions.reply', 'رد')}
                                </DropdownMenuItem>
                                {isOwner && (
                                    <DropdownMenuItem onClick={onPin} className="gap-2 text-primary">
                                        <Pin className="w-4 h-4" /> {t('chat.actions.pin', 'تثبيت')}
                                    </DropdownMenuItem>
                                )}
                                {(isOwn || isOwner) && (
                                    <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
                                        <Trash2 className="w-4 h-4" /> {t('chat.actions.delete', 'حذف')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}
