import { createClient } from '@supabase/supabase-js';

export const getOrderNotifications = async (req: any, res: any) => {
    

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

        const userId = user.id
        const body = req.body || {}
        const onlyUnread = body.onlyUnread ?? false

        // Fetch notifications
        let query = supabaseAdmin
            .from('order_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (onlyUnread) {
            query = query.eq('is_read', false)
        }

        const { data: notifications, error } = await query

        if (error) throw error

        const formattedNotifications = (notifications || []).map((n: any) => ({
            id: n.id,
            orderId: n.order_id,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.is_read,
            createdAt: n.created_at
        }))

        return res.status(200).json({ notifications: formattedNotifications })

    } catch (error: any) {
        console.error('get-order-notifications error:', error)
        return res.status(400).json({ error: error.message })
    }
}