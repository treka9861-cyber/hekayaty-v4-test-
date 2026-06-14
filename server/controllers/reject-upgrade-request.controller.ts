import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/reject-upgrade-request
 * Admin only.
 * 
 * Marks the upgrade request as rejected.
 * The subscription is never modified — it continues exactly as before.
 * Allows the user to submit a new request later.
 */
export const rejectUpgradeRequest = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // 1. Auth + Admin check
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !adminUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        const { data: adminData } = await supabaseAdmin.from('users').select('role').eq('id', adminUser.id).single();
        if (adminData?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin only' });

        const { requestId, reason } = req.body;
        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        // 2. Fetch the upgrade request
        const { data: upgradeReq, error: reqError } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .select('id, user_id, status, target_billing_cycle, current_billing_cycle, subscription_id')
            .eq('id', requestId)
            .single();

        if (reqError || !upgradeReq) return res.status(404).json({ error: 'Upgrade request not found' });
        if (upgradeReq.status !== 'pending') {
            return res.status(409).json({ error: `This request is already ${upgradeReq.status}` });
        }

        const now = new Date();

        // 3. Mark as rejected — subscription is NOT touched
        const { error: updateError } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .update({
                status: 'rejected',
                reviewed_by: adminUser.id,
                reviewed_at: now.toISOString(),
                rejection_reason: reason || null,
                updated_at: now.toISOString(),
            })
            .eq('id', requestId);

        if (updateError) throw updateError;

        // 4. Notify the user
        const rejectionContent = reason
            ? `تم رفض طلب ترقية اشتراكك من ${upgradeReq.current_billing_cycle} إلى ${upgradeReq.target_billing_cycle}. السبب: ${reason}`
            : `تم رفض طلب ترقية اشتراكك من ${upgradeReq.current_billing_cycle} إلى ${upgradeReq.target_billing_cycle}. يرجى التواصل مع الدعم لمزيد من المعلومات.`;

        await supabaseAdmin.from('notifications').insert({
            user_id: upgradeReq.user_id,
            type: 'upgrade_request_rejected',
            title: 'تم رفض طلب الترقية',
            content: rejectionContent,
            priority: 'high',
        });

        return res.status(200).json({
            success: true,
            message: 'Upgrade request rejected. Subscription unchanged. User has been notified.',
        });

    } catch (error: any) {
        console.error('reject-upgrade-request error:', error);
        return res.status(500).json({ error: error.message });
    }
};
