import { createClient } from '@supabase/supabase-js';

export const getUserSubscriptions = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Invalid session' });

        const { data, error } = await supabaseAdmin
            .from('creator_subscriptions')
            .select('id, plan_id, pricing_id, status, current_period_end, created_at')
            .eq('user_id', authUser.id)
            .in('status', ['active', 'pending', 'past_due'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Manually fetch plans for these subscriptions
        const planIds = [...new Set((data || []).map((s: any) => s.plan_id).filter(Boolean))];
        let plans: any[] = [];
        if (planIds.length > 0) {
            const { data: p } = await supabaseAdmin
                .from('membership_plans')
                .select('id, name, club_id')
                .in('id', planIds);
            plans = p || [];
        }

        const planMap = new Map(plans.map((p: any) => [p.id, p]));

        // Fetch clubs and stores to get creator details
        const clubIds = [...new Set(plans.map((p: any) => p.club_id).filter(Boolean))];
        let clubs: any[] = [];
        if (clubIds.length > 0) {
            const { data: c } = await supabaseAdmin
                .from('membership_clubs')
                .select('id, name, store_id')
                .in('id', clubIds);
            clubs = c || [];
        }

        const storeIds = [...new Set(clubs.map((c: any) => c.store_id).filter(Boolean))];
        let stores: any[] = [];
        if (storeIds.length > 0) {
            const { data: s } = await supabaseAdmin
                .from('users')
                .select('id, display_name, username')
                .in('id', storeIds);
            stores = s || [];
        }

        const clubMap = new Map(clubs.map((c: any) => [c.id, c]));
        const storeMap = new Map(stores.map((s: any) => [s.id, s]));

        // === AUTO-HEAL: Fix pending subscriptions whose orders are already verified ===
        const pendingSubs = (data || []).filter((s: any) => s.status === 'pending');
        if (pendingSubs.length > 0) {
            for (const sub of pendingSubs) {
                // Use .contains() — same pattern as approve-subscription controller (proven to work)
                const { data: linkedItems } = await supabaseAdmin
                    .from('order_items')
                    .select('order_id')
                    .contains('customization_data', { subscription_id: sub.id });

                if (linkedItems && linkedItems.length > 0) {
                    const orderIds = linkedItems.map((i: any) => i.order_id);
                    const { data: verifiedOrders } = await supabaseAdmin
                        .from('orders')
                        .select('id')
                        .in('id', orderIds)
                        .eq('is_verified', true);

                    if (verifiedOrders && verifiedOrders.length > 0) {
                        await supabaseAdmin
                            .from('creator_subscriptions')
                            .update({ status: 'active' })
                            .eq('id', sub.id);
                        sub.status = 'active'; // Update local data to reflect new status
                        try {
                            await supabaseAdmin.rpc('provision_entitlements', { p_subscription_id: sub.id });
                        } catch (_e) { /* non-fatal */ }
                        console.log(`[get-user-subscriptions] Auto-healed: ${sub.id} → active`);
                    }
                }
            }
        }
        // === END AUTO-HEAL ===

        // Build enriched response
        const enriched = (data || []).map((sub: any) => {
            const plan = planMap.get(sub.plan_id);
            const club = clubMap.get(plan?.club_id);
            const storeUser = storeMap.get(club?.store_id) || {};
            return {
                ...sub,
                plan,
                club,
                creator_name: storeUser.display_name || 'Hekayaty',
                creator_username: storeUser.username || ''
            };
        });

        return res.status(200).json(enriched);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
