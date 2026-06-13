import { createClient } from '@supabase/supabase-js';

export const requestPayout = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' })
        }

        const supabaseUrl = process.env['SUPABASE_URL'] || ''
        const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || ''
        const supabaseAdmin = createClient(supabaseUrl, serviceKey)

        // Strict verification
        const token = authHeader.replace(/Bearer /i, '').trim()
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            console.error("❌ Auth Error:", authError?.message);
            return res.status(401).json({ error: 'Unauthorized', details: authError?.message })
        }

        const body = req.body
        const { amount, method, methodDetails } = body

        // Calculate Balance
        const [
            { data: earnings },
            { data: payouts }
        ] = await Promise.all([
            supabaseAdmin.from('earnings').select('amount').eq('creator_id', user.id),
            supabaseAdmin.from('payouts').select('amount, status').eq('user_id', user.id)
        ])

        const totalNet = earnings?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
        const totalPaid = payouts?.filter(p => p.status === 'processed').reduce((sum, p) => sum + p.amount, 0) || 0
        const pending = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0
        const available = totalNet - totalPaid - pending

        if (amount > available) {
            return res.status(400).json({ error: `Insufficient balance: Only ${available} available` })
        }

        // Insert
        const { data: payout, error: payoutError } = await supabaseAdmin
            .from('payouts')
            .insert({
                user_id: user.id,
                amount,
                method,
                method_details: methodDetails,
                status: 'pending'
            })
            .select()
            .single()

        if (payoutError) throw payoutError

        console.log('✅ Payout success:', payout.id);
        return res.status(201).json({ payout, success: true })

    } catch (error: any) {
        console.error('❌ Payout Error:', error);
        return res.status(500).json({ error: error.message })
    }
}