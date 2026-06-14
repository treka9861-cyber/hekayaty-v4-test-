import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/get-user-upgrade-requests
 * User-facing.
 *
 * Returns the current user's own upgrade requests so they can see
 * the status (pending / approved / rejected) of their submissions.
 */
export const getUserUpgradeRequests = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        const { data, error } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .select(`
                id,
                subscription_id,
                status,
                current_billing_cycle,
                target_billing_cycle,
                snapshot_amount_due_cents,
                snapshot_credit_cents,
                snapshot_new_period_end,
                snapshot_bonus_days,
                payment_method,
                payment_reference,
                rejection_reason,
                created_at,
                updated_at
            `)
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json(data || []);

    } catch (error: any) {
        console.error('get-user-upgrade-requests error:', error);
        return res.status(500).json({ error: error.message });
    }
};
