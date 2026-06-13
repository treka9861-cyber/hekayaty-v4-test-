import { createClient } from '@supabase/supabase-js';
import { calculateCommission } from '../utils/financial';

console.log("Verify payment function starting...")

export const verifyPayment = async (req: any, res: any) => {
    

    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            throw new Error('Unauthorized: Missing token')
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            throw new Error('Unauthorized: Invalid or expired token');
        }

        const userId = authUser.id;
        const { orderId } = req.body;

        // Check if user is admin
        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', userId).single()
        if (userData?.role !== 'admin') throw new Error('Forbidden: Admin only')

        // 1. Fetch Order
        const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single()
        if (!order) throw new Error("Order not found")
        if (order.status === 'paid') throw new Error("Order already paid")

        // 2. Fetch Items (Include product and collection details)
        const { data: items, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select(`
                *,
                product:products(writer_id, type),
                collection:collections(writer_id)
            `)
            .eq('order_id', orderId)

        if (itemsError || !items || items.length === 0) throw new Error("No items found or failed to fetch")

        // 3. Update Order Status
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'paid', is_verified: true })
            .eq('id', orderId)

        if (updateError) throw updateError

        // 4. Calculate Earnings
        const earningsByCreator = new Map<string, number>()
        const writerIds = new Set<string>()

        // First pass: Identify all writers
        items.forEach((item: any) => {
            const writerId = item.product?.writer_id || item.collection?.writer_id
            if (writerId) writerIds.add(writerId)
        })

        // Process each item
        for (const item of items) {
            const writerId = (item as any).product?.writer_id || (item as any).collection?.writer_id
            if (!writerId) continue

            // Use the unified centralized 20% platform fee logic
            const quantity = Number(item.quantity) || 1
            const totalPrice = Number(item.price) * quantity

            const { fee, earning } = calculateCommission(totalPrice);

            earningsByCreator.set(writerId, (earningsByCreator.get(writerId) || 0) + earning)

            // Increment sales count for products (by quantity, not just 1)
            if (item.product_id) {
                const qty = Number(item.quantity) || 1
                for (let i = 0; i < qty; i++) {
                    await supabaseAdmin.rpc('increment_sales_count', { product_id: item.product_id })
                }
            }
        }

        // 4b. Shipping Logic
        if (order.shipping_cost > 0 && order.shipping_address) {
            const city = (order.shipping_address as any).city?.toLowerCase().trim();
            const creatorIds = Array.from(earningsByCreator.keys());

            for (const creatorId of creatorIds) {
                const { data: rates } = await supabaseAdmin.from('shipping_rates').select('*').eq('creator_id', creatorId);
                if (rates && rates.length > 0) {
                    const matchedRate = rates.find((r: any) => r.region_name.toLowerCase() === city) ||
                        rates.find((r: any) => ['all', 'default', 'nationwide'].includes(r.region_name.toLowerCase()));
                    if (matchedRate) {
                        earningsByCreator.set(creatorId, (earningsByCreator.get(creatorId) || 0) + matchedRate.amount);
                    }
                }
            }
        }

        // 5. Insert Earnings Records
        for (const [creatorId, amount] of Array.from(earningsByCreator.entries())) {
            await supabaseAdmin.from('earnings').insert({
                creator_id: creatorId,
                order_id: orderId,
                amount: Math.round(amount),
                status: 'pending'
            })
        }

        // 6. Auto-activate any linked subscriptions
        // When admin verifies a subscription payment order, activate the subscription automatically
        const subscriptionItems = items.filter((item: any) => item.customization_data?.subscription_id);
        if (subscriptionItems.length > 0) {
            for (const item of subscriptionItems) {
                const subscriptionId = item.customization_data.subscription_id;
                // Fetch the subscription to check it's still pending
                const { data: sub } = await supabaseAdmin
                    .from('creator_subscriptions')
                    .select('id, status, user_id, plan_id, pricing:plan_pricing(billing_cycle)')
                    .eq('id', subscriptionId)
                    .single();

                if (sub && sub.status === 'pending') {
                    // Calculate exact end date from the moment of approval
                    let daysToAdd = 30; // 1 month fallback
                    const billingCycle = (sub as any).pricing?.billing_cycle;
                    if (billingCycle === 'monthly') daysToAdd = 30;
                    else if (billingCycle === 'quarterly') daysToAdd = 90;
                    else if (billingCycle === 'semi_annual') daysToAdd = 180;
                    else if (billingCycle === 'annual') daysToAdd = 365;

                    const newStartDate = new Date();
                    const newEndDate = new Date();
                    newEndDate.setDate(newStartDate.getDate() + daysToAdd);

                    // Activate the subscription
                    await supabaseAdmin
                        .from('creator_subscriptions')
                        .update({ 
                            status: 'active',
                            current_period_start: newStartDate.toISOString(),
                            current_period_end: newEndDate.toISOString()
                        })
                        .eq('id', subscriptionId);

                    // Try to provision entitlements (access to club content)
                    try {
                        await supabaseAdmin.rpc('provision_entitlements', { p_subscription_id: subscriptionId });
                    } catch (rpcErr) {
                        console.warn('provision_entitlements RPC failed (non-fatal):', rpcErr);
                    }

                    // Notify the user
                    try {
                        const { data: planData } = await supabaseAdmin
                            .from('membership_plans')
                            .select('name')
                            .eq('id', sub.plan_id)
                            .single();
                        await supabaseAdmin.from('notifications').insert({
                            user_id: sub.user_id,
                            type: 'subscription_approved',
                            title: 'Subscription Approved! 🎉',
                            content: `Your subscription to "${planData?.name || 'the plan'}" has been approved. Enjoy your benefits!`,
                            priority: 'high',
                        });
                    } catch (notifErr) {
                        console.warn('Notification insert failed (non-fatal):', notifErr);
                    }

                    console.log(`[verify-payment] Auto-activated subscription ${subscriptionId} for user ${sub.user_id}`);
                }
            }
        }

        return res.status(200).json({ success: true })

    } catch (error: any) {
        console.error('Verify payment error:', error)
        return res.status(400).json({ error: error.message })
    }
}