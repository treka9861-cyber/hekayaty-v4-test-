import { createClient } from '@supabase/supabase-js';

export const rejectSubscription = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', authUser.id).single();
        if (userData?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin only' });

        const { subscriptionId, reason } = req.body;
        if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

        // 1. Fetch subscription to get user info
        const { data: sub, error: subFetchError } = await supabaseAdmin
            .from('creator_subscriptions')
            .select('user_id, plan:membership_plans(name)')
            .eq('id', subscriptionId)
            .single();

        if (subFetchError || !sub) return res.status(404).json({ error: 'Subscription not found' });

        // 2. Cancel the subscription
        const { error: updateError } = await supabaseAdmin
            .from('creator_subscriptions')
            .update({ status: 'canceled' })
            .eq('id', subscriptionId);

        if (updateError) throw updateError;

        // 3. Mark linked orders as rejected
        const { data: items } = await supabaseAdmin
            .from('order_items')
            .select('order_id')
            .contains('customization_data', { subscription_id: subscriptionId });

        if (items && items.length > 0) {
            const orderIds = items.map((i: any) => i.order_id);
            await supabaseAdmin.from('orders').update({ status: 'rejected' }).in('id', orderIds);
        }

        // 4. Notify the user
        await supabaseAdmin.from('notifications').insert({
            user_id: sub.user_id,
            type: 'subscription_rejected',
            title: 'Subscription Payment Not Verified',
            content: reason
                ? `Your subscription to "${(sub.plan as any)?.name}" was rejected. Reason: ${reason}`
                : `Your subscription payment to "${(sub.plan as any)?.name}" could not be verified. Please contact support.`,
            priority: 'high',
        });

        return res.status(200).json({ success: true, message: 'Subscription rejected.' });
    } catch (error: any) {
        console.error('reject-subscription error:', error);
        return res.status(500).json({ error: error.message });
    }
};
