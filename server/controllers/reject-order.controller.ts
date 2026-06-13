import { createClient } from '@supabase/supabase-js';

export const rejectOrder = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            throw new Error('Unauthorized: Missing token')
        }

        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            throw new Error('Unauthorized: Invalid session');
        }

        const userId = authUser.id;

        // Check if user is admin
        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', userId).single()
        if (userData?.role !== 'admin') throw new Error('Forbidden: Admin only')

        const body = req.body

        const { orderId } = body

        const { error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'rejected' })
            .eq('id', orderId)

        if (error) throw error

        return res.status(200).json({ success: true })
    } catch (error: any) {
        return res.status(400).json({ error: error.message })
    }
}