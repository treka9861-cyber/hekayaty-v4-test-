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
 * POST /api/edge/upgrade-subscription
 * 
 * Submits an upgrade REQUEST for admin review.
 * Does NOT modify the creator_subscriptions row.
 * The subscription remains fully active and unchanged.
 * Only an admin approval can apply the actual upgrade.
 */
export const upgradeSubscription = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // 1. Authenticate user
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        // 2. Parse request body
        const { subscriptionId, targetPricingId, paymentProofUrl, paymentReference, paymentMethod } = req.body;
        if (!subscriptionId || !targetPricingId) {
            return res.status(400).json({ error: 'subscriptionId and targetPricingId are required' });
        }

        // 3. Fetch current subscription
        const { data: sub, error: subError } = await supabaseAdmin
            .from('creator_subscriptions')
            .select(`
                id,
                user_id,
                plan_id,
                pricing_id,
                status,
                current_period_end,
                pricing:plan_pricing!pricing_id(id, price_in_cents, billing_cycle)
            `)
            .eq('id', subscriptionId)
            .single();

        if (subError || !sub) return res.status(404).json({ error: 'Subscription not found' });
        if (sub.user_id !== authUser.id) return res.status(403).json({ error: 'Forbidden: You do not own this subscription' });
        if (sub.status !== 'active') return res.status(400).json({ error: `Cannot upgrade a subscription with status: ${sub.status}` });

        const currentPricing = Array.isArray(sub.pricing) ? sub.pricing[0] : sub.pricing;
        if (!currentPricing) return res.status(500).json({ error: 'Current subscription pricing data is missing' });

        // 4. Check for an existing pending upgrade request (duplicate prevention)
        const { data: existingRequest } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .select('id, status')
            .eq('subscription_id', subscriptionId)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingRequest) {
            return res.status(409).json({ 
                error: 'An upgrade request is already pending for this subscription. Please wait for admin review.',
                requestId: existingRequest.id
            });
        }

        // 5. Fetch target pricing
        const { data: targetPricing, error: targetError } = await supabaseAdmin
            .from('plan_pricing')
            .select('id, plan_id, price_in_cents, billing_cycle, is_active')
            .eq('id', targetPricingId)
            .single();

        if (targetError || !targetPricing) return res.status(404).json({ error: 'Target pricing not found' });
        if (!targetPricing.is_active) return res.status(400).json({ error: 'Target pricing plan is no longer active' });
        if (targetPricing.id === currentPricing.id) return res.status(400).json({ error: 'Already subscribed to this exact pricing tier' });

        // 6. Run proration math server-side (snapshot for display — will be recalculated at approval)
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);

        if (periodEnd <= now) {
            return res.status(400).json({ error: 'Subscription has already expired' });
        }

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

        const snapshotNewPeriodEnd = new Date(now);
        snapshotNewPeriodEnd.setDate(now.getDate() + targetCycleDays + bonusDays);

        // 7. Validate: payment proof required if amount is due
        if (amountDueCents > 0 && !paymentReference && !paymentProofUrl) {
            return res.status(400).json({ error: 'Payment proof or reference is required when an amount is due' });
        }

        // 8. Create the upgrade request record (subscription untouched)
        const { data: newRequest, error: insertError } = await supabaseAdmin
            .from('subscription_upgrade_requests')
            .insert({
                subscription_id: subscriptionId,
                user_id: authUser.id,
                status: 'pending',
                current_pricing_id: currentPricing.id,
                target_pricing_id: targetPricingId,
                current_billing_cycle: currentPricing.billing_cycle,
                target_billing_cycle: targetPricing.billing_cycle,
                snapshot_remaining_days: remainingDays,
                snapshot_credit_cents: creditCents,
                snapshot_amount_due_cents: amountDueCents,
                snapshot_new_period_end: snapshotNewPeriodEnd.toISOString(),
                snapshot_bonus_days: bonusDays,
                payment_method: paymentMethod || null,
                payment_reference: paymentReference || null,
                payment_proof_url: paymentProofUrl || null,
            })
            .select('id')
            .single();

        if (insertError || !newRequest) {
            // Handle unique constraint violation (race condition fallback)
            if (insertError?.code === '23505') {
                return res.status(409).json({ error: 'An upgrade request is already pending for this subscription.' });
            }
            throw insertError;
        }

        // 9. Notify the user their request is under review
        await supabaseAdmin.from('notifications').insert({
            user_id: authUser.id,
            type: 'upgrade_request_submitted',
            title: 'طلب الترقية قيد المراجعة ⏳',
            content: `تم استلام طلب ترقية اشتراكك من ${currentPricing.billing_cycle} إلى ${targetPricing.billing_cycle}. سيتم مراجعته من قبل الإدارة قريباً.`,
            priority: 'medium',
        });

        return res.status(201).json({
            success: true,
            status: 'pending',
            requestId: newRequest.id,
            message: 'Upgrade request submitted successfully. It is now under admin review.',
            snapshot: {
                creditCents,
                amountDueCents,
                bonusDays,
                snapshotNewPeriodEnd: snapshotNewPeriodEnd.toISOString()
            }
        });

    } catch (error: any) {
        console.error('submit-upgrade-request error:', error);
        return res.status(500).json({ error: error.message });
    }
};
