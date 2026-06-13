import { createClient } from '@supabase/supabase-js';

console.log("Update fulfillment function starting...")

export const updateFulfillment = async (req: any, res: any) => {
    

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

        const { orderItemId, status, trackingNumber } = req.body

        if (!orderItemId || !status) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        console.log(`Updating fulfillment: Item ${orderItemId}, Status ${status}`)

        // Verify this order item belongs to the user
        const { data: orderItem } = await supabaseAdmin
            .from('order_items')
            .select('creator_id')
            .eq('id', orderItemId)
            .single()

        if (!orderItem || orderItem.creator_id !== user.id) {
            return res.status(403).json({ error: 'Forbidden: Not your order' })
        }

        // Update the order item
        const updateData: any = {
            fulfillment_status: status
        }

        if (trackingNumber) {
            updateData.tracking_number = trackingNumber
        }

        if (status === 'shipped') {
            updateData.shipped_at = new Date().toISOString()
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('order_items')
            .update(updateData)
            .eq('id', orderItemId)
            .select()
            .single()

        if (updateError) {
            throw new Error('Failed to update fulfillment status')
        }

        console.log('Fulfillment updated successfully')

        return res.status(200).json({ orderItem: updated, success: true })

    } catch (error: any) {
        console.error('Update fulfillment error:', error)
        return res.status(500).json({ error: error.message })
    }
}