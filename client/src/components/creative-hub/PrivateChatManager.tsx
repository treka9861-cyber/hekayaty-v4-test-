import { useState, useRef, useEffect } from "react";
import { User, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { usePrivateChats, usePrivateChat, PrivateChat } from "@/hooks/use-private-chat";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn, formatDate } from "@/lib/utils";

export function PrivateChatManager() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [selectedChat, setSelectedChat] = useState<PrivateChat | null>(null);

    // Fetch all chats
    const { data: chats, isLoading: chatsLoading } = usePrivateChats(user?.role as 'client' | 'artist');

    const currentLocale = i18n.language === 'ar' ? ar : enUS;

    return (
        <div className="flex h-[calc(100vh-200px)] border border-white/10 rounded-xl overflow-hidden glass-card">
            {/* Chat List Sidebar */}
            <div className="w-1/3 border-r border-white/10 flex flex-col bg-black/20">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-bold flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Private Messages
                    </h2>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {chatsLoading && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>
                        )}
                        {!chatsLoading && chats?.length === 0 && (
                            <div className="p-8 text-center text-sm text-muted-foreground">No active conversations.</div>
                        )}
                        {chats?.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={cn(
                                    "w-full p-3 flex items-center gap-3 rounded-lg transition-colors text-left hover:bg-white/5",
                                    selectedChat?.id === chat.id ? "bg-primary/10 border border-primary/20" : ""
                                )}
                            >
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={chat.otherUser?.avatarUrl || ''} />
                                    <AvatarFallback>{chat.otherUser?.displayName?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-bold text-sm truncate">{chat.otherUser?.displayName}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {formatDate(chat.updatedAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate opacity-70">
                                        Click to view conversation
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-black/40">
                {selectedChat ? (
                    <EmbeddedChatWindow chat={selectedChat} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                        <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                        <p>اختر محادثة للبدء في المراسلة</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmbeddedChatWindow({ chat }: { chat: PrivateChat }) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { messages, sendMessage, isLoading } = usePrivateChat(chat.id);
    const [inputValue, setInputValue] = useState('');
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

    const handleSend = () => {
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue('');
    };

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={chat.otherUser?.avatarUrl || ''} />
                    <AvatarFallback>{chat.otherUser?.displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-bold text-sm">{chat.otherUser?.displayName}</h3>
                    <p className="text-[10px] text-muted-foreground">@{chat.otherUser?.username}</p>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                            <User className="w-12 h-12 mb-4" />
                            <p className="text-sm">No messages yet.</p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 transition-colors duration-500 rounded-lg",
                                message.senderId === user?.id ? "flex-row-reverse" : ""
                            )}
                        >
                            <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                                <AvatarImage src={message.sender?.avatarUrl || ''} />
                                <AvatarFallback>{message.sender?.displayName?.[0] || '?'}</AvatarFallback>
                            </Avatar>

                            <div className={cn("flex flex-col max-w-[80%]", message.senderId === user?.id ? "items-end" : "items-start")}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold opacity-80">{message.sender?.displayName}</span>
                                    <span className="text-[10px] opacity-40">
                                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: currentLocale })}
                                    </span>
                                </div>

                                <div className={cn(
                                    "px-4 py-2 rounded-2xl text-sm",
                                    message.senderId === user?.id
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-muted text-foreground rounded-tl-none border border-white/5"
                                )}>
                                    {message.content}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-black/40 border-white/10"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <Button size="icon" onClick={handleSend} disabled={!inputValue.trim()}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </>
    );
}
