import { createClient } from '@supabase/supabase-js';

export const rejectOrderItem = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) throw new Error('Unauthorized: Missing token')

        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Unauthorized: Invalid session')
        }

        const makerId = user.id
        const body = req.body || {}

        const { orderItemId, reason } = body

        if (!orderItemId) throw new Error('Order item ID required')
        if (!reason || reason.trim().length < 5) {
            throw new Error('Rejection reason must be at least 5 characters')
        }

        // Verify ownership
        const { data: item } = await supabaseAdmin
            .from('order_items')
            .select('id, creator_id, order_id, fulfillment_status')
            .eq('id', orderItemId)
            .single()

        if (!item) throw new Error('Order item not found')
        if (item.creator_id !== makerId) throw new Error('Unauthorized: Not your order')
        if (!['pending', 'accepted'].includes(item.fulfillment_status)) {
            throw new Error(`Cannot reject order with status: ${item.fulfillment_status}`)
        }

        // Update to rejected
        const { error: updateError } = await supabaseAdmin
            .from('order_items')
            .update({
                fulfillment_status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejection_reason: reason.trim()
            })
            .eq('id', orderItemId)

        if (updateError) throw updateError

        // Log status change
        await supabaseAdmin.rpc('log_status_change', {
            p_order_item_id: orderItemId,
            p_status: 'rejected',
            p_note: reason.trim(),
            p_created_by: makerId
        })

        // Notify buyer
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('id, user_id')
            .eq('id', item.order_id)
            .single()

        if (order) {
            await supabaseAdmin.rpc('create_order_notification', {
                p_order_id: order.id,
                p_user_id: order.user_id,
                p_type: 'order_rejected',
                p_title: 'Order Rejected',
                p_message: `Your order was rejected. Reason: ${reason.trim()}`
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Order rejected'
        })

    } catch (error: any) {
        console.error('reject-order-item error:', error)
        return res.status(400).json({ error: error.message })
    }
}