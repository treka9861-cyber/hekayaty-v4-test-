import { createClient } from '@supabase/supabase-js';

// Helper function to calculate exact days in a billing cycle
const getBillingCycleDays = (cycle: string): number => {
    switch (cycle) {
        case 'monthly': return 30;
        case 'quarterly': return 90;
        case 'semi_annual': return 180;
        case 'annual': return 365;
        default: return 30; // Fallback
    }
};

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
        const { subscriptionId, targetPricingId, paymentProofUrl, paymentReference } = req.body;
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
                status,
                current_period_end,
                upgrade_in_progress,
                pricing:plan_pricing!pricing_id(id, price_in_cents, billing_cycle)
            `)
            .eq('id', subscriptionId)
            .single();

        if (subError || !sub) return res.status(404).json({ error: 'Subscription not found' });
        if (sub.user_id !== authUser.id) return res.status(403).json({ error: 'Forbidden: You do not own this subscription' });
        if (sub.status !== 'active') return res.status(400).json({ error: `Cannot upgrade a subscription with status: ${sub.status}` });
        if (sub.upgrade_in_progress) return res.status(409).json({ error: 'An upgrade is already in progress for this subscription' });

        const currentPricing = Array.isArray(sub.pricing) ? sub.pricing[0] : sub.pricing;
        if (!currentPricing) return res.status(500).json({ error: 'Current subscription pricing data is missing' });

        // 4. Fetch target pricing
        const { data: targetPricing, error: targetError } = await supabaseAdmin
            .from('plan_pricing')
            .select('id, plan_id, price_in_cents, billing_cycle, is_active')
            .eq('id', targetPricingId)
            .single();

        if (targetError || !targetPricing) return res.status(404).json({ error: 'Target pricing not found' });
        if (!targetPricing.is_active) return res.status(400).json({ error: 'Target pricing plan is no longer active' });
        if (targetPricing.plan_id !== sub.plan_id) return res.status(400).json({ error: 'Cannot upgrade to a pricing tier of a different membership plan' });
        if (targetPricing.id === currentPricing.id) return res.status(400).json({ error: 'Already subscribed to this exact pricing tier' });

        // 5. Proration Math (Server-Side Only - Identical to preview controller)
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        
        if (periodEnd <= now) {
             return res.status(400).json({ error: 'Subscription has expired' });
        }

        const remainingMs = periodEnd.getTime() - now.getTime();
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        const currentCycleDays = getBillingCycleDays(currentPricing.billing_cycle);
        const dailyValueCents = currentPricing.price_in_cents / currentCycleDays;
        const creditCents = Math.floor(remainingDays * dailyValueCents);
        
        const targetCycleDays = getBillingCycleDays(targetPricing.billing_cycle);
        const targetPriceCents = targetPricing.price_in_cents;
        
        let amountDueCents = targetPriceCents - creditCents;
        let bonusDays = 0;

        if (amountDueCents < 0) {
            const extraCredit = Math.abs(amountDueCents);
            const newPlanDailyValue = targetPriceCents / targetCycleDays;
            if (newPlanDailyValue > 0) {
                bonusDays = Math.floor(extraCredit / newPlanDailyValue);
            }
            amountDueCents = 0;
        }

        // Validate payment info if amount is due
        if (amountDueCents > 0 && !paymentProofUrl && !paymentReference) {
             return res.status(400).json({ error: 'Payment proof or reference is required for upgrades requiring payment' });
        }

        const newPeriodEnd = new Date(now);
        newPeriodEnd.setDate(now.getDate() + targetCycleDays + bonusDays);

        // 6. Lock the subscription (Idempotency)
        const { error: lockError } = await supabaseAdmin
            .from('creator_subscriptions')
            .update({ upgrade_in_progress: true })
            .eq('id', subscriptionId)
            .eq('upgrade_in_progress', false); // Atomic check-and-set

        if (lockError) {
             return res.status(409).json({ error: 'Failed to acquire upgrade lock. Another process may be updating this subscription.' });
        }

        try {
            // 7. Apply the upgrade (Atomic Update)
            const { error: updateError } = await supabaseAdmin
                .from('creator_subscriptions')
                .update({ 
                    pricing_id: targetPricingId,
                    current_period_end: newPeriodEnd.toISOString(),
                    upgrade_in_progress: false, // Release lock
                    updated_at: now.toISOString()
                })
                .eq('id', subscriptionId);

            if (updateError) throw updateError;

            // 8. Audit Log
            await supabaseAdmin.from('subscription_upgrade_log').insert({
                subscription_id: subscriptionId,
                user_id: authUser.id,
                event_type: 'upgrade',
                old_pricing_id: currentPricing.id,
                new_pricing_id: targetPricingId,
                old_billing_cycle: currentPricing.billing_cycle,
                new_billing_cycle: targetPricing.billing_cycle,
                old_period_end: sub.current_period_end,
                new_period_end: newPeriodEnd.toISOString(),
                remaining_days: remainingDays,
                daily_value_cents: Math.round(dailyValueCents),
                credit_cents: creditCents,
                new_price_cents: targetPriceCents,
                amount_due_cents: amountDueCents,
                payment_reference: paymentReference || null,
                payment_proof_url: paymentProofUrl || null
            });

            // 9. Re-provision Entitlements
            // Note: Since subscription ID hasn't changed, this updates the existing entitlements
            // to reflect the new billing cycle limits.
            const { error: rpcError } = await supabaseAdmin.rpc('provision_entitlements', { p_subscription_id: subscriptionId });
            if (rpcError) console.error('Failed to reprovision entitlements after upgrade:', rpcError);

            // 10. Notify User
            await supabaseAdmin.from('notifications').insert({
                user_id: authUser.id,
                type: 'subscription_upgraded',
                title: 'Subscription Upgraded! 🚀',
                content: `Your subscription has been successfully upgraded to the ${targetPricing.billing_cycle} cycle.`,
                priority: 'high',
            });

            // 11. Create Earnings (If payment was made)
            if (amountDueCents > 0) {
                 const { data: planData } = await supabaseAdmin.from('membership_plans').select('club_id').eq('id', targetPricing.plan_id).single();
                 if (planData?.club_id) {
                     const { data: clubData } = await supabaseAdmin.from('membership_clubs').select('store_id').eq('id', planData.club_id).single();
                     if (clubData?.store_id) {
                          // The platform fee is 20% of the UPGRADE AMOUNT, not the full new price
                          const platformFee = Math.round(amountDueCents * 0.20);
                          const earning = amountDueCents - platformFee;
                          
                          // Convert cents to currency unit (e.g. EGP/USD) for earnings table
                          const earningAmount = earning / 100;

                          await supabaseAdmin.from('earnings').insert({
                              creator_id: clubData.store_id,
                              amount: earningAmount,
                              status: 'pending',
                              // Note: we don't have an order_id here since upgrades don't create orders currently
                          });
                     }
                 }
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Subscription successfully upgraded.',
                newPeriodEnd: newPeriodEnd.toISOString()
            });

        } catch (innerError: any) {
             // Attempt to release lock on failure
             await supabaseAdmin.from('creator_subscriptions').update({ upgrade_in_progress: false }).eq('id', subscriptionId);
             throw innerError;
        }

    } catch (error: any) {
        console.error('upgrade-subscription error:', error);
        return res.status(500).json({ error: error.message });
    }
};
