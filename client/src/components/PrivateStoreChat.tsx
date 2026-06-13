import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    Send,
    X,
    MoreVertical,
    User,
    Lock
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
import { usePrivateChat } from '@/hooks/use-private-chat';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PrivateStoreChatProps {
    artistId: string;
    artistName: string;
}

export function PrivateStoreChat({ artistId, artistName }: PrivateStoreChatProps) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);

    const { messages, sendMessage, startChat, isLoading } = usePrivateChat(chatId);

    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    // Initialize/Find Chat on Open
    useEffect(() => {
        if (isOpen && user && !chatId) {
            startChat(artistId).then(id => setChatId(id));
        }
    }, [isOpen, user, artistId, chatId, startChat]);

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    if (!user) return null; // Only logged in users can chat
    if (user.id === artistId) return null; // Artists don't chat with themselves this way (they use dashboard)

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="default"
                    size="lg"
                    className="fixed bottom-24 right-6 z-50 rounded-full shadow-2xl gap-2 h-14 px-6 border border-primary/20 backdrop-blur-md transition-all hover:scale-105 bg-primary text-primary-foreground"
                >
                    <Lock className="w-5 h-5" />
                    <span className="font-bold">{t('chat.private_button', 'محادثة خاصة')}</span>
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col glass-card border-l border-white/10">
                <SheetHeader className="p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary" />
                            <span>{t('chat.private_title', 'محادثة خاصة')}</span>
                            <span className="text-xs font-normal text-muted-foreground">مع {artistName}</span>
                        </SheetTitle>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.length === 0 && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <User className="w-12 h-12 mb-4" />
                                <p className="text-sm">{t('chat.private_empty', 'ابدأ محادثة خاصة مع الفنان.')}</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2 transition-colors duration-500 rounded-lg",
                                    message.senderId === user.id ? "flex-row-reverse" : ""
                                )}
                            >
                                <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                                    <AvatarImage src={message.sender?.avatarUrl || ''} />
                                    <AvatarFallback>{message.sender?.displayName?.[0] || '?'}</AvatarFallback>
                                </Avatar>

                                <div className={cn("flex flex-col max-w-[80%]", message.senderId === user.id ? "items-end" : "items-start")}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold opacity-80">{message.sender?.displayName}</span>
                                        <span className="text-[10px] opacity-40">
                                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: currentLocale })}
                                        </span>
                                    </div>

                                    <div className={cn(
                                        "px-4 py-2 rounded-2xl text-sm",
                                        message.senderId === user.id
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none border border-white/5"
                                    )}>
                                        {message.content}
                                    </div>

                                    {message.senderId === user.id && (
                                        <span className="text-[10px] opacity-50 mt-1">
                                            {message.isRead ? "مقروءة" : "أرسلت"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={t('chat.type_message', 'اكتب رسالة خاصة...')}
                            className="bg-black/40 border-white/10"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
