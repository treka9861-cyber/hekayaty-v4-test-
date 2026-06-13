import { createClient } from '@supabase/supabase-js';

export const freezeSeller = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) throw new Error('Missing authorization header')

        const supabaseClient = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_ANON_KEY'] ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
        if (userData?.role !== 'admin') throw new Error('Forbidden: Admin only')

        const { userId, isActive } = req.body

        const { error } = await supabaseAdmin
            .from('users')
            .update({ is_active: isActive })
            .eq('id', userId)

        if (error) throw error

        return res.status(200).json({ success: true })
    } catch (error: any) {
        return res.status(400).json({ error: error.message })
    }
}