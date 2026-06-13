import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
    id: string;
    store_id: string;
    sender_id: string;
    content: string;
    reply_to_id: string | null;
    is_pinned: boolean;
    created_at: string;
    sender?: {
        username: string;
        display_name: string;
        avatar_url: string | null;
        is_verified?: boolean;
    };
    reply_to?: ChatMessage | null;
}

export function useChat(storeId: string) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
    const channelRef = useRef<any>(null);

    // Fetch initial messages
    const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
        queryKey: ['chat-messages', storeId],
        queryFn: async () => {
            let query = supabase
                .from('chat_messages')
                .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(username, display_name, avatar_url, is_verified)
        `);

            if (storeId === 'global') {
                query = query.is('store_id', null);
            } else {
                query = query.eq('store_id', storeId);
            }

            const { data, error } = await query.order('created_at', { ascending: true });

            if (error) throw error;
            return data as ChatMessage[];
        },
        enabled: storeId !== undefined,
    });

    // Real-time Ultra-Speed Channel (Broadcast + DB)
    useEffect(() => {
        if (!storeId) return;

        const channel = supabase
            .channel(`store_chat:${storeId}`, {
                config: {
                    broadcast: { self: false }, // Don't broadcast to self, we use Optimistic UI
                    presence: { key: user?.id },
                },
            })
            // 1. LISTEN FOR ULTRA-FAST BROADCASTS
            .on('broadcast', { event: 'new_message' }, (payload) => {
                const { message } = payload.payload;
                queryClient.setQueryData(['chat-messages', storeId], (old: ChatMessage[] | undefined) => {
                    if (!old) return [message];
                    if (old.some(m => m.id === message.id)) return old; // Avoid dups
                    return [...old, message];
                });
            })
            // 2. LISTEN FOR UPDATES/DELETES IN DB
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: storeId === 'global' ? `store_id=is.null` : `store_id=eq.${storeId}`
                },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        queryClient.setQueryData(['chat-messages', storeId], (old: ChatMessage[] | undefined) => {
                            return old?.filter(m => m.id !== payload.old.id) || [];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        queryClient.setQueryData(['chat-messages', storeId], (old: ChatMessage[] | undefined) => {
                            return old?.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m) || [];
                        });
                    }
                }
            )
            .subscribe((status) => {
                setIsRealtimeEnabled(status === 'SUBSCRIBED');
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId, queryClient, user?.id]);

    // Send message mutation (Optimistic & Fast)
    const sendMutation = useMutation({
        mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string | null }) => {
            if (!user) throw new Error('Unauthorized');

            const tempId = crypto.randomUUID();
            const messageData = {
                id: tempId,
                store_id: storeId === 'global' ? null : storeId,
                sender_id: user.id,
                content,
                reply_to_id: replyToId || null,
                is_pinned: false,
                created_at: new Date().toISOString(),
                sender: {
                    username: user.username,
                    display_name: user.displayName,
                    avatar_url: user.avatarUrl
                }
            } as ChatMessage;

            // BROADCAST IMMEDIATELY TO EVERYONE ELSE
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { message: messageData },
                });
            }

            // SAVE TO DB FOR PERSISTENCE
            const { data, error } = await supabase
                .from('chat_messages')
                .insert({
                    id: tempId,
                    store_id: storeId === 'global' ? null : storeId,
                    sender_id: user.id,
                    content,
                    reply_to_id: replyToId || null,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        // OPTIMISTIC UI: Show message on our screen instantly
        onMutate: async (newMsg) => {
            await queryClient.cancelQueries({ queryKey: ['chat-messages', storeId] });
            const previousMessages = queryClient.getQueryData(['chat-messages', storeId]);

            const optimisticMsg = {
                id: 'temp-' + Date.now(),
                store_id: storeId === 'global' ? null : storeId,
                sender_id: user?.id,
                content: newMsg.content,
                reply_to_id: newMsg.replyToId,
                is_pinned: false,
                created_at: new Date().toISOString(),
                sender: {
                    username: user?.username,
                    display_name: user?.displayName,
                    avatar_url: user?.avatarUrl
                }
            } as any;

            queryClient.setQueryData(['chat-messages', storeId], (old: any) => [...(old || []), optimisticMsg]);

            return { previousMessages };
        },
        onError: (err, newMsg, context: any) => {
            queryClient.setQueryData(['chat-messages', storeId], context.previousMessages);
            toast({ title: 'Error sending message', description: err.message, variant: 'destructive' });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', storeId] });
        }
    });

    // Delete message mutation
    const deleteMutation = useMutation({
        mutationFn: async (messageId: string) => {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Message deleted' });
        },
    });

    // Pin message mutation
    const pinMutation = useMutation({
        mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
            // First, unpin everything for this store (MVP only allows 1 pinned message)
            if (isPinned) {
                await supabase
                    .from('chat_messages')
                    .update({ is_pinned: false })
                    .eq('store_id', storeId);
            }

            const { error } = await supabase
                .from('chat_messages')
                .update({ is_pinned: isPinned })
                .eq('id', messageId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Message status updated' });
        },
    });

    // Report message mutation
    const reportMutation = useMutation({
        mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
            if (!user) throw new Error('Unauthorized');
            const { error } = await supabase
                .from('chat_reports')
                .insert({
                    message_id: messageId,
                    reporter_id: user.id,
                    reason
                });

            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: 'Report submitted', description: 'Thank you for keeping Hekayaty safe.' });
        },
    });

    return {
        messages,
        isLoading,
        isRealtimeEnabled,
        sendMessage: sendMutation.mutateAsync,
        isSending: sendMutation.isPending,
        deleteMessage: deleteMutation.mutateAsync,
        pinMessage: pinMutation.mutateAsync,
        reportMessage: reportMutation.mutateAsync,
    };
}
