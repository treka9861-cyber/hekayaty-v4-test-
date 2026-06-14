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
 * POST /api/edge/get-upgrade-requests
 * Admin only.
 * 
 * Returns all upgrade requests enriched with user info, plan info, and
 * LIVE recalculated proration amounts so the admin sees current numbers.
 */
export const getUpgradeRequests = async (req: any, res: any) => {
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

        const statusFilter = req.body?.status || req.query?.status || 'pending';

        // 2. Fetch upgrade requests
        let query = supabaseAdmin
            .from('subscription_upgrade_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: requests, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        if (!requests || requests.length === 0) {
            return res.status(200).json([]);
        }

        // 3. Batch fetch all related data
        const userIds = [...new Set(requests.map((r: any) => r.user_id).filter(Boolean))];
        const subIds = [...new Set(requests.map((r: any) => r.subscription_id).filter(Boolean))];
        const pricingIds = [...new Set([
            ...requests.map((r: any) => r.current_pricing_id),
            ...requests.map((r: any) => r.target_pricing_id),
        ].filter(Boolean))];

        const [
            { data: users },
            { data: subscriptions },
            { data: pricings },
        ] = await Promise.all([
            userIds.length > 0 ? supabaseAdmin.from('users').select('id, display_name, email, username').in('id', userIds) : { data: [] },
            subIds.length > 0 ? supabaseAdmin.from('creator_subscriptions').select('id, plan_id, pricing_id, status, current_period_end').in('id', subIds) : { data: [] },
            pricingIds.length > 0 ? supabaseAdmin.from('plan_pricing').select('id, plan_id, billing_cycle, price_in_cents').in('id', pricingIds) : { data: [] },
        ]);

        const planIds = [...new Set([
            ...(subscriptions || []).map((s: any) => s.plan_id),
            ...(pricings || []).map((p: any) => p.plan_id)
        ].filter(Boolean))];
        const { data: plans } = planIds.length > 0
            ? await supabaseAdmin.from('membership_plans').select('id, name, club_id').in('id', planIds)
            : { data: [] };

        const clubIds = [...new Set((plans || []).map((p: any) => p.club_id).filter(Boolean))];
        const { data: clubs } = clubIds.length > 0
            ? await supabaseAdmin.from('membership_clubs').select('id, name').in('id', clubIds)
            : { data: [] };

        // Build maps
        const userMap = new Map((users || []).map((u: any) => [u.id, u]));
        const subMap = new Map((subscriptions || []).map((s: any) => [s.id, s]));
        const pricingMap = new Map((pricings || []).map((p: any) => [p.id, p]));
        const planMap = new Map((plans || []).map((p: any) => [p.id, p]));
        const clubMap = new Map((clubs || []).map((c: any) => [c.id, c]));

        const now = new Date();

        // 4. Enrich each request with live recalculated amounts
        const enriched = requests.map((req: any) => {
            const sub = subMap.get(req.subscription_id);
            const currentPricing = pricingMap.get(req.current_pricing_id);
            const targetPricing = pricingMap.get(req.target_pricing_id);
            const plan = sub ? planMap.get(sub.plan_id) : null;
            const club = plan ? clubMap.get(plan.club_id) : null;
            const targetPlan = targetPricing ? planMap.get(targetPricing.plan_id) : null;

            // Live recalculation (only for pending requests)
            let liveCalculation: any = null;
            if (req.status === 'pending' && sub && currentPricing && targetPricing && sub.current_period_end) {
                const periodEnd = new Date(sub.current_period_end);
                if (periodEnd > now) {
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
                    liveCalculation = { remainingDays, creditCents, amountDueCents, bonusDays };
                } else {
                    liveCalculation = { expired: true };
                }
            }

            return {
                ...req,
                user: userMap.get(req.user_id) || null,
                subscription: sub || null,
                currentPricing: currentPricing || null,
                targetPricing: targetPricing || null,
                plan: plan || null,
                targetPlan: targetPlan || null,
                club: club || null,
                liveCalculation,
            };
        });

        return res.status(200).json(enriched);

    } catch (error: any) {
        console.error('get-upgrade-requests error:', error);
        return res.status(500).json({ error: error.message });
    }
};
