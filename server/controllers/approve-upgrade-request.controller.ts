import { createClient } from '@supabase/supabase-js';
import { calculateProratedUpgrade } from './upgrade-subscription-preview.controller';

const getBillingCycleDays = (cycle: string): number => {
    switch (cycle) {
        case 'monthly': return 30;
        case 'quarterly': return 90;
        case 'semi_annual': return 180;
        case 'annual': return 365;
        default: return 30;
    }
};

/**
 * POST /api/edge/approve-upgrade-request
 * Admin only.
 * 
 * Re-calculates proration at approval time, validates the subscription
 * is still active, then atomically applies the upgrade.
 */
export const approveUpgradeRequest = async (req: any, res: any) => {
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

        const { requestId } = req.body;
        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        // 2. Fetch the upgrade request
        const { data: upgradeReq, error: reqError } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !upgradeReq) return res.status(404).json({ error: 'Upgrade request not found' });
        if (upgradeReq.status !== 'pending') {
            return res.status(409).json({ error: `This request is already ${upgradeReq.status}` });
        }

        // 3. Fetch the subscription — verify it's still active
        const { data: sub, error: subError } = await supabaseAdmin
            .from('creator_subscriptions')
            .select(`
                id, user_id, plan_id, pricing_id, status, current_period_end,
                pricing:plan_pricing!pricing_id(id, price_in_cents, billing_cycle)
            `)
            .eq('id', upgradeReq.subscription_id)
            .single();

        if (subError || !sub) {
            await supabaseAdmin.from('subscription_upgrade_requests')
                .update({ status: 'expired', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString(), rejection_reason: 'Subscription not found' })
                .eq('id', requestId);
            return res.status(400).json({ error: 'Subscription not found. Request auto-rejected.' });
        }

        if (sub.status !== 'active') {
            await supabaseAdmin.from('subscription_upgrade_requests')
                .update({ status: 'expired', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString(), rejection_reason: `Subscription is ${sub.status}` })
                .eq('id', requestId);
            await supabaseAdmin.from('notifications').insert({
                user_id: upgradeReq.user_id,
                type: 'upgrade_request_expired',
                title: 'انتهت صلاحية طلب الترقية',
                content: `لا يمكن تطبيق طلب الترقية لأن الاشتراك لم يعد نشطاً.`,
                priority: 'high',
            });
            return res.status(400).json({ error: `Subscription is ${sub.status}. Request auto-expired.` });
        }

        // 4. Verify plan hasn't changed (no conflicting modifications)
        if (String(sub.pricing_id) !== String(upgradeReq.current_pricing_id)) {
            await supabaseAdmin.from('subscription_upgrade_requests')
                .update({ status: 'expired', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString(), rejection_reason: 'Subscription pricing changed after request was submitted' })
                .eq('id', requestId);
            return res.status(409).json({ error: 'Subscription pricing changed since request was submitted. Request auto-expired.' });
        }

        // 5. Verify subscription has not expired
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        if (periodEnd <= now) {
            await supabaseAdmin.from('subscription_upgrade_requests')
                .update({ status: 'expired', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString(), rejection_reason: 'Subscription expired before approval' })
                .eq('id', requestId);
            await supabaseAdmin.from('notifications').insert({
                user_id: upgradeReq.user_id,
                type: 'upgrade_request_expired',
                title: 'انتهت صلاحية طلب الترقية',
                content: 'انتهى اشتراكك قبل مراجعة طلب الترقية.',
                priority: 'high',
            });
            return res.status(400).json({ error: 'Subscription has expired. Request auto-expired.' });
        }

        // 6. Fetch target pricing
        const { data: targetPricing, error: targetError } = await supabaseAdmin
            .from('plan_pricing')
            .select('id, plan_id, price_in_cents, billing_cycle, is_active')
            .eq('id', upgradeReq.target_pricing_id)
            .single();

        if (targetError || !targetPricing || !targetPricing.is_active) {
            return res.status(400).json({ error: 'Target pricing no longer available' });
        }

        // 7. RE-CALCULATE proration at approval time (authoritative calculation)
        const currentPricing = Array.isArray(sub.pricing) ? sub.pricing[0] : sub.pricing;
        if (!currentPricing) return res.status(500).json({ error: 'Current pricing data missing' });

        const remainingMs = periodEnd.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        const currentCycleDays = getBillingCycleDays(currentPricing.billing_cycle);
        const targetCycleDays = getBillingCycleDays(targetPricing.billing_cycle);

        const { remainingValueCents: creditCents, amountDueCents, bonusDays } = calculateProratedUpgrade(
            remainingDays,
            currentPricing.price_in_cents,
            currentCycleDays,
            targetPricing.price_in_cents,
            targetCycleDays
        );

        const newPeriodEnd = new Date(now);
        newPeriodEnd.setDate(now.getDate() + targetCycleDays + bonusDays);

        // 8. Apply the upgrade atomically
        const { error: updateError } = await supabaseAdmin
            .from('creator_subscriptions')
            .update({
                pricing_id: targetPricing.id,
                current_period_end: newPeriodEnd.toISOString(),
                upgrade_in_progress: false,
                updated_at: now.toISOString(),
            })
            .eq('id', upgradeReq.subscription_id)
            .eq('status', 'active'); // Guard: only update if still active

        if (updateError) throw updateError;

        // 9. Mark request as approved
        await supabaseAdmin.from('subscription_upgrade_requests')
            .update({
                status: 'approved',
                reviewed_by: adminUser.id,
                reviewed_at: now.toISOString(),
                updated_at: now.toISOString(),
            })
            .eq('id', requestId);

        // 10. Audit log
        await supabaseAdmin.from('subscription_upgrade_log').insert({
            subscription_id: upgradeReq.subscription_id,
            user_id: upgradeReq.user_id,
            event_type: 'upgrade',
            old_pricing_id: currentPricing.id,
            new_pricing_id: targetPricing.id,
            old_billing_cycle: currentPricing.billing_cycle,
            new_billing_cycle: targetPricing.billing_cycle,
            old_period_end: sub.current_period_end,
            new_period_end: newPeriodEnd.toISOString(),
            remaining_days: remainingDays,
            daily_value_cents: Math.round(currentPricing.price_in_cents / currentCycleDays),
            credit_cents: creditCents,
            new_price_cents: targetPricing.price_in_cents,
            amount_due_cents: amountDueCents,
            payment_reference: upgradeReq.payment_reference || null,
            payment_proof_url: upgradeReq.payment_proof_url || null,
            metadata: { approved_by: adminUser.id, upgrade_request_id: requestId }
        });

        // 11. Re-provision entitlements
        const { error: rpcError } = await supabaseAdmin.rpc('provision_entitlements', { p_subscription_id: upgradeReq.subscription_id });
        if (rpcError) console.error('Failed to reprovision entitlements after upgrade approval:', rpcError);

        // 12. Create earnings (if payment was made)
        if (amountDueCents > 0) {
            const { data: planData } = await supabaseAdmin.from('membership_plans').select('club_id').eq('id', sub.plan_id).single();
            if (planData?.club_id) {
                const { data: clubData } = await supabaseAdmin.from('membership_clubs').select('store_id').eq('id', planData.club_id).single();
                if (clubData?.store_id) {
                    const platformFee = Math.round(amountDueCents * 0.20);
                    const earning = (amountDueCents - platformFee) / 100;
                    await supabaseAdmin.from('earnings').insert({
                        creator_id: clubData.store_id,
                        amount: earning,
                        status: 'pending',
                        metadata: { source: 'subscription_upgrade', upgrade_request_id: requestId }
                    });
                }
            }
        }

        // 13. Notify user
        await supabaseAdmin.from('notifications').insert({
            user_id: upgradeReq.user_id,
            type: 'upgrade_request_approved',
            title: 'تمت الموافقة على طلب الترقية! 🎉',
            content: `تم ترقية اشتراكك إلى خطة ${targetPricing.billing_cycle}. الاشتراك ساري حتى ${newPeriodEnd.toLocaleDateString()}.`,
            priority: 'high',
        });

        return res.status(200).json({
            success: true,
            message: 'Upgrade request approved and subscription updated.',
            newPeriodEnd: newPeriodEnd.toISOString(),
            amountDueCents,
            creditCents,
            bonusDays,
        });

    } catch (error: any) {
        console.error('approve-upgrade-request error:', error);
        return res.status(500).json({ error: error.message });
    }
};
