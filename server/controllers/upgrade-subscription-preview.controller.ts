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

export const calculateProratedUpgrade = (
    daysRemaining: number,
    currentPriceInCents: number,
    currentCycleDays: number,
    targetPriceInCents: number,
    targetCycleDays: number = 30 // Provide a default or pass it in tests
) => {
    // Value of current plan per day
    const dailyValueCents = currentPriceInCents / currentCycleDays;
    
    // Total remaining credit (ceil to favor user as per specs)
    const creditCents = Math.ceil(daysRemaining * dailyValueCents);
    
    // Calculate amount due
    let amountDueCents = targetPriceInCents - creditCents;
    let bonusDays = 0;

    if (amountDueCents <= 0) { // Changed to <= to handle exactly 0
        // Credit exceeds the new price. User pays 0, and gets bonus days on the new plan.
        const extraCredit = Math.abs(amountDueCents);
        const newPlanDailyValue = targetPriceInCents / targetCycleDays;
        
        if (newPlanDailyValue > 0) {
            bonusDays = Math.floor(extraCredit / newPlanDailyValue);
        }
        amountDueCents = 0;
    }

    return {
        remainingValueCents: creditCents,
        amountDueCents,
        bonusDays
    };
}

export const previewSubscriptionUpgrade = async (req: any, res: any) => {
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
        const { subscriptionId, targetPricingId } = req.body;
        if (!subscriptionId || !targetPricingId) {
            return res.status(400).json({ error: 'subscriptionId and targetPricingId are required' });
        }

        // 3. Fetch current subscription with its plan and pricing details
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

        if (subError || !sub) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (sub.user_id !== authUser.id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this subscription' });
        }

        if (sub.status !== 'active') {
            return res.status(400).json({ error: `Cannot upgrade a subscription with status: ${sub.status}` });
        }

        if (sub.upgrade_in_progress) {
            return res.status(409).json({ error: 'An upgrade is already in progress for this subscription' });
        }

        // Handle case where pricing info might be missing
        const currentPricing = Array.isArray(sub.pricing) ? sub.pricing[0] : sub.pricing;
        if (!currentPricing) {
            return res.status(500).json({ error: 'Current subscription pricing data is missing' });
        }

        // 4. Fetch target pricing
        const { data: targetPricing, error: targetError } = await supabaseAdmin
            .from('plan_pricing')
            .select('id, plan_id, price_in_cents, billing_cycle, is_active')
            .eq('id', targetPricingId)
            .single();

        if (targetError || !targetPricing) {
            return res.status(404).json({ error: 'Target pricing not found' });
        }

        if (!targetPricing.is_active) {
            return res.status(400).json({ error: 'Target pricing plan is no longer active' });
        }

        if (targetPricing.plan_id !== sub.plan_id) {
            return res.status(400).json({ error: 'Cannot upgrade to a pricing tier of a different membership plan' });
        }

        if (targetPricing.id === currentPricing.id) {
            return res.status(400).json({ error: 'Already subscribed to this exact pricing tier' });
        }

        // 5. Proration Math (Server-Side Only)
        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        
        // Ensure period hasn't passed
        if (periodEnd <= now) {
             return res.status(400).json({ error: 'Subscription has expired' });
        }

        const remainingMs = periodEnd.getTime() - now.getTime();
        // Always round up days to favor the user
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        
        const currentCycleDays = getBillingCycleDays(currentPricing.billing_cycle);
        
        // Value of current plan per day
        const dailyValueCents = currentPricing.price_in_cents / currentCycleDays;
        
        // Target plan details
        const targetCycleDays = getBillingCycleDays(targetPricing.billing_cycle);
        const targetPriceCents = targetPricing.price_in_cents;
        
        const { remainingValueCents: creditCents, amountDueCents, bonusDays } = calculateProratedUpgrade(
            remainingDays,
            currentPricing.price_in_cents,
            currentCycleDays,
            targetPriceCents,
            targetCycleDays
        );

        // Calculate new period end
        const newPeriodEnd = new Date(now);
        newPeriodEnd.setDate(now.getDate() + targetCycleDays + bonusDays);

        // 6. Return breakdown to client
        return res.status(200).json({
            currentPriceCents: currentPricing.price_in_cents,
            currentBillingCycle: currentPricing.billing_cycle,
            targetPriceCents,
            targetBillingCycle: targetPricing.billing_cycle,
            remainingDays,
            dailyValueCents: Math.round(dailyValueCents),
            creditCents,
            amountDueCents,
            bonusDays,
            newPeriodEnd: newPeriodEnd.toISOString(),
            isAutoApprovalEligible: amountDueCents === 0
        });

    } catch (error: any) {
        console.error('preview-subscription-upgrade error:', error);
        return res.status(500).json({ error: error.message });
    }
};
