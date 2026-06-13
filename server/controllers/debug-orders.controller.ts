import { createClient } from '@supabase/supabase-js';

export const debugOrders = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const { data: orders, error } = await supabaseAdmin
            .from('orders')
            .select('id, user_id, status, is_verified, created_at')
            .order('created_at', { ascending: false })
            .limit(20)

        const { data: users } = await supabaseAdmin.from('users').select('id, display_name').limit(10)

        return res.status(200).json({ orders, error, users })
    } catch (e: any) {
        return res.status(500).json({ error: e.message })
    }
}