import { createClient } from '@supabase/supabase-js';

export const getAllPayouts = async (req: any, res: any) => {
    

    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            throw new Error('Unauthorized: Missing token')
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            throw new Error('Unauthorized: Invalid session');
        }

        const userId = authUser.id;

        const { data: userData, error: userFetchError } = await supabaseAdmin.from('users').select('role').eq('id', userId).single()

        if (userFetchError || userData?.role !== 'admin') {
            throw new Error(`Forbidden: Admin only.`)
        }

        // Get status filter from query/body (optional)
        let statusFilter = 'pending'
        try {
            const body = req.body
            if (body.status) statusFilter = body.status
        } catch (e: any) { }

        // Fetch payouts based on status
        let query = supabaseAdmin
            .from('payouts')
            .select('*, user:users!left(display_name, email)')
            .order('requested_at', { ascending: false })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const { data, error } = await query

        if (error) {
            console.error('❌ get-all-payouts: SQL error:', error)
            throw error
        }

        return res.status(200).json(data)
    } catch (error: any) {
        console.error('❌ get-all-payouts error:', error)
        return res.status(400).json({ error: error.message })
    }
}