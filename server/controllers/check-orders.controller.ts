import { createClient } from '@supabase/supabase-js';

export const checkOrders = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const body = req.body || {}
        const { targetUserId } = body

        if (!targetUserId) throw new Error("targetUserId required")

        const { data: orders, error: ordersError } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, status, is_verified, created_at')
            .eq('user_id', targetUserId)

        const { data: items, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select('id, order_id, creator_id, fulfillment_status')

        return res.status(200).json({
            userId: targetUserId,
            orders,
            ordersError,
            itemsCount: items?.length,
            allOrdersInTable: (await supabaseAdmin.from('orders').select('id, user_id, status')).data
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}