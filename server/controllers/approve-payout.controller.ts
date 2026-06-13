import { createClient } from '@supabase/supabase-js';

export const approvePayout = async (req: any, res: any) => {
    

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

        const { payoutId, status = 'processed' } = req.body

        // Update payout status
        const { data: payout, error: payoutError } = await supabaseAdmin
            .from('payouts')
            .update({
                status: status,
                processed_at: status === 'processed' ? new Date().toISOString() : null
            })
            .eq('id', payoutId)
            .select()
            .single()

        if (payoutError) throw payoutError

        return res.status(200).json({ success: true, payout })
    } catch (error: any) {
        return res.status(400).json({ error: error.message })
    }
}