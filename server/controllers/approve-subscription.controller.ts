import { createClient } from '@supabase/supabase-js';

export const approveSubscription = async (req: any, res: any) => {
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

        const { subscriptionId } = req.body;
        if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

        // 1. Fetch the subscription
        const { data: sub, error: subFetchError } = await supabaseAdmin
            .from('creator_subscriptions')
            .select('*, plan:membership_plans(id, name, club_id), pricing:plan_pricing(billing_cycle)')
            .eq('id', subscriptionId)
            .single();

        if (subFetchError || !sub) return res.status(404).json({ error: 'Subscription not found' });
        if (sub.status === 'active') return res.status(400).json({ error: 'Subscription is already active' });

        // Calculate exact exact end date from the moment of approval
        let daysToAdd = 30; // 1 month fallback
        const billingCycle = (sub as any).pricing?.billing_cycle;
        if (billingCycle === 'monthly') daysToAdd = 30;
        else if (billingCycle === 'quarterly') daysToAdd = 90;
        else if (billingCycle === 'semi_annual') daysToAdd = 180;
        else if (billingCycle === 'annual') daysToAdd = 365;

        const newStartDate = new Date();
        const newEndDate = new Date();
        newEndDate.setDate(newStartDate.getDate() + daysToAdd);

        // 2. Activate the subscription
        const { error: updateError } = await supabaseAdmin
            .from('creator_subscriptions')
            .update({ 
                status: 'active',
                current_period_start: newStartDate.toISOString(),
                current_period_end: newEndDate.toISOString()
            })
            .eq('id', subscriptionId);

        if (updateError) throw updateError;

        // 3. Mark the linked order as paid
        await supabaseAdmin
            .from('order_items')
            .select('order_id')
            .contains('customization_data', { subscription_id: subscriptionId })
            .then(async ({ data: items }) => {
                if (items && items.length > 0) {
                    const orderIds = items.map((i: any) => i.order_id);
                    await supabaseAdmin.from('orders').update({ status: 'paid', is_verified: true }).in('id', orderIds);

                    // Create earnings for the creator
                    const { data: club } = sub.plan?.club_id
                        ? await supabaseAdmin.from('membership_clubs').select('store_id').eq('id', sub.plan.club_id).single()
                        : { data: null };

                    if (club?.store_id) {
                        for (const item of items) {
                            const { data: orderData } = await supabaseAdmin.from('orders').select('total_amount').eq('id', item.order_id).single();
                            if (orderData) {
                                const platformFee = Math.round(orderData.total_amount * 0.20);
                                const earning = orderData.total_amount - platformFee;
                                await supabaseAdmin.from('earnings').insert({
                                    creator_id: club.store_id,
                                    order_id: item.order_id,
                                    amount: earning,
                                    status: 'pending'
                                });
                            }
                        }
                    }
                }
            });

        // 4. Provision entitlements (grant access to plan benefits)
        const { error: rpcError } = await supabaseAdmin.rpc('provision_entitlements', { p_subscription_id: subscriptionId });
        if (rpcError) console.error('Failed to provision entitlements:', rpcError);

        // 5. Notify the user
        await supabaseAdmin.from('notifications').insert({
            user_id: sub.user_id,
            type: 'subscription_approved',
            title: 'Subscription Approved! 🎉',
            content: `Your subscription to "${sub.plan?.name}" has been approved. Enjoy your benefits!`,
            priority: 'high',
        });

        return res.status(200).json({ success: true, message: 'Subscription approved and entitlements provisioned.' });
    } catch (error: any) {
        console.error('approve-subscription error:', error);
        return res.status(500).json({ error: error.message });
    }
};
