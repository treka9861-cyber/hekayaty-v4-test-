import { createClient } from '@supabase/supabase-js';

export const markDelivered = async (req: any, res: any) => {
    

    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        // Get user ID strictly from token
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            throw new Error('Unauthorized: Missing token')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !authUser) {
            throw new Error('Unauthorized: Invalid session')
        }

        const userId = authUser.id
        const body = req.body || {}

        const { orderItemId } = body

        if (!orderItemId) throw new Error('Order item ID required')

        // Verify ownership (maker or admin)
        const { data: item } = await supabaseAdmin
            .from('order_items')
            .select('id, creator_id, order_id, fulfillment_status')
            .eq('id', orderItemId)
            .single()

        if (!item) throw new Error('Order item not found')

        // Check if user is admin
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single()

        const isAdmin = user?.role === 'admin'
        const isMaker = item.creator_id === userId

        if (!isAdmin && !isMaker) {
            throw new Error('Unauthorized: Not your order')
        }

        if (item.fulfillment_status !== 'shipped') {
            throw new Error(`Cannot mark as delivered. Current status: ${item.fulfillment_status}`)
        }

        // Update to delivered
        const { error: updateError } = await supabaseAdmin
            .from('order_items')
            .update({
                fulfillment_status: 'delivered',
                delivered_at: new Date().toISOString()
            })
            .eq('id', orderItemId)

        if (updateError) throw updateError

        // Log status change
        await supabaseAdmin.rpc('log_status_change', {
            p_order_item_id: orderItemId,
            p_status: 'delivered',
            p_note: 'Order successfully delivered',
            p_created_by: userId
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
                p_type: 'order_delivered',
                p_title: 'Order Delivered!',
                p_message: 'Your order has been delivered. Enjoy your purchase!'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Order marked as delivered'
        })

    } catch (error: any) {
        console.error('mark-delivered error:', error)
        return res.status(400).json({ error: error.message })
    }
}