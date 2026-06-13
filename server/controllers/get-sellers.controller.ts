import { createClient } from '@supabase/supabase-js';

export const getSellers = async (req: any, res: any) => {
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

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .in('role', ['writer', 'artist'])
            .order('created_at', { ascending: false })

        if (error) throw error

        return res.status(200).json(data)
    } catch (error: any) {
        return res.status(500).json({ error: error.message })
    }
}