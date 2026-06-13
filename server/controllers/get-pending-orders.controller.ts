import { createClient } from '@supabase/supabase-js';

export const getPendingOrders = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' })
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            return res.status(401).json({ error: 'Unauthorized: Invalid session' })
        }

        const userId = authUser.id;

        // Check if user is admin
        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', userId).single()
        if (userData?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin only' })
        }

        // Get status filter from query params or body (Express style)
        let statusFilter = req.query?.status || req.body?.status || 'pending'

        let query = supabaseAdmin
            .from('orders')
            .select('*, user:users!left(display_name, email), order_items(*, product:products(title, type))')
            .order('created_at', { ascending: false })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const { data, error } = await query

        if (error) throw error

        return res.status(200).json(data)
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}