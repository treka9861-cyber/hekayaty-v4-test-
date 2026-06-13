import { createClient } from '@supabase/supabase-js';

export const updateShipment = async (req: any, res: any) => {
    

    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        // Get maker ID strictly from token
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            throw new Error('Unauthorized: Missing token')
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Unauthorized: Invalid session')
        }

        const makerId = user.id
        const body = req.body || {}

        const { orderItemId, trackingNumber, carrier } = body

        if (!orderItemId) throw new Error('Order item ID required')
        if (!trackingNumber || trackingNumber.trim().length < 3) {
            throw new Error('Valid tracking number required')
        }

        // Verify ownership and status
        const { data: item } = await supabaseAdmin
            .from('order_items')
            .select('id, creator_id, order_id, fulfillment_status')
            .eq('id', orderItemId)
            .single()

        if (!item) throw new Error('Order item not found')
        if (item.creator_id !== makerId) throw new Error('Unauthorized: Not your order')

        if (!['accepted', 'preparing'].includes(item.fulfillment_status)) {
            throw new Error(`Cannot ship order with status: ${item.fulfillment_status}`)
        }

        // Update to shipped
        const { error: updateError } = await supabaseAdmin
            .from('order_items')
            .update({
                fulfillment_status: 'shipped',
                tracking_number: trackingNumber.trim(),
                shipped_at: new Date().toISOString()
            })
            .eq('id', orderItemId)

        if (updateError) throw updateError

        // Log status change
        const note = carrier ? `Shipped via ${carrier}. Tracking: ${trackingNumber.trim()}` : `Tracking: ${trackingNumber.trim()}`
        await supabaseAdmin.rpc('log_status_change', {
            p_order_item_id: orderItemId,
            p_status: 'shipped',
            p_note: note,
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
                p_type: 'order_shipped',
                p_title: 'Order Shipped!',
                p_message: `Your order is on the way! Tracking number: ${trackingNumber.trim()}`
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Shipment updated successfully'
        })

    } catch (error: any) {
        console.error('update-shipment error:', error)
        return res.status(400).json({ error: error.message })
    }
}