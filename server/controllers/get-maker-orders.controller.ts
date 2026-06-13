import { createClient } from '@supabase/supabase-js';

export const getMakerOrders = async (req: any, res: any) => {
    

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

        // Parse body
        const body = req.body || {}

        // Check if user is admin
        const { data: userRecord } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', makerId)
            .single()

        const isAdmin = userRecord?.role === 'admin'

        // Optional status filter
        const statusFilter = body.status || null

        // Fetch order items
        let query = supabaseAdmin
            .from('order_items')
            .select(`
                id,
                order_id,
                product_id,
                price,
                fulfillment_status,
                tracking_number,
                shipped_at,
                accepted_at,
                rejected_at,
                rejection_reason,
                delivered_at,
                preparing_at,
                estimated_delivery_days,
                creator_id,
                quantity,
                customization_data,
                product:products(id, title, cover_url),
                order:orders(id, user_id, created_at, shipping_address, status, is_verified)
            `)

        // Admins see all, others see only their own
        if (!isAdmin) {
            query = query.eq('creator_id', makerId)
        }

        query = query.order('created_at', { ascending: false, referencedTable: 'orders' })

        if (statusFilter) {
            query = query.eq('fulfillment_status', statusFilter)
        }

        const { data: items, error } = await query

        if (error) throw error

        // Fetch user/creator info
        const userIds = Array.from(new Set(items?.map((item: any) => item.order?.user_id).filter(Boolean)))
        const creatorIds = Array.from(new Set(items?.map((item: any) => item.creator_id).filter(Boolean)))
        const allUserIds = Array.from(new Set([...userIds, ...creatorIds]))

        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, display_name')
            .in('id', allUserIds)

        const usersMap = new Map(users?.map((u: any) => [u.id, u.display_name]))

        // Format response
        const orders = items?.map((item: any) => ({
            orderItemId: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            productTitle: item.product?.title || 'Unknown Product',
            productCoverUrl: item.product?.cover_url || '',
            price: item.price,
            quantity: item.quantity || 1,
            fulfillmentStatus: item.fulfillment_status,
            trackingNumber: item.tracking_number,
            customizationData: item.customization_data,
            shippingAddress: item.order?.shipping_address || null,
            buyerName: usersMap.get(item.order?.user_id) || 'Unknown',
            buyerId: item.order?.user_id,
            makerName: usersMap.get(item.creator_id) || 'Unknown Creator',
            makerId: item.creator_id,
            orderDate: item.order?.created_at,
            acceptedAt: item.accepted_at,
            shippedAt: item.shipped_at,
            deliveredAt: item.delivered_at,
            preparingAt: item.preparing_at,
            rejectedAt: item.rejected_at,
            rejectionReason: item.rejection_reason,
            estimatedDeliveryDays: item.estimated_delivery_days,
            isVerified: item.order?.is_verified || false,
            orderStatus: item.order?.status
        })) || []

        // Filter out unverified orders (payment not confirmed)
        const verifiedOrders = orders
            .filter((o: any) => o.isVerified)
            .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())

        return res.status(200).json({ orders: verifiedOrders })

    } catch (error: any) {
        console.error('get-maker-orders error:', error)
        return res.status(400).json({ error: error.message })
    }
}