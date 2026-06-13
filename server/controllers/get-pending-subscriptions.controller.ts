import { createClient } from '@supabase/supabase-js';

export const getPendingSubscriptions = async (req: any, res: any) => {
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

        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', authUser.id).single();
        if (userData?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admin only' });

        const statusFilter = req.query?.status || req.body?.status || 'pending';

        let query = supabaseAdmin
            .from('creator_subscriptions')
            .select(`
                id,
                user_id,
                plan_id,
                pricing_id,
                status,
                current_period_start,
                current_period_end,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch related details manually since FKs might not be defined in PostgREST
        const userIds = [...new Set((data || []).map((s: any) => s.user_id).filter(Boolean))];
        const planIds = [...new Set((data || []).map((s: any) => s.plan_id).filter(Boolean))];
        const pricingIds = [...new Set((data || []).map((s: any) => s.pricing_id).filter(Boolean))];

        const [{ data: users }, { data: plans }, { data: pricings }] = await Promise.all([
            userIds.length > 0
                ? supabaseAdmin.from('users').select('id, display_name, email').in('id', userIds)
                : { data: [] },
            planIds.length > 0
                ? supabaseAdmin.from('membership_plans').select('id, name, club_id').in('id', planIds)
                : { data: [] },
            pricingIds.length > 0
                ? supabaseAdmin.from('plan_pricing').select('id, price_in_cents, billing_cycle').in('id', pricingIds)
                : { data: [] }
        ]);

        const clubIds = [...new Set((plans || []).map((p: any) => p.club_id).filter(Boolean))];
        const { data: clubs } = clubIds.length > 0
            ? await supabaseAdmin.from('membership_clubs').select('id, name, store_id').in('id', clubIds)
            : { data: [] };

        const userMap = new Map((users || []).map((u: any) => [u.id, u]));
        const planMap = new Map((plans || []).map((p: any) => [p.id, p]));
        const pricingMap = new Map((pricings || []).map((p: any) => [p.id, p]));
        const clubMap = new Map((clubs || []).map((c: any) => [c.id, c]));

        const enriched = (data || []).map((sub: any) => {
            const plan = planMap.get(sub.plan_id);
            return {
                ...sub,
                user: userMap.get(sub.user_id),
                plan: plan,
                pricing: pricingMap.get(sub.pricing_id),
                club: clubMap.get(plan?.club_id),
            };
        });

        return res.status(200).json(enriched);
    } catch (error: any) {
        console.error('get-pending-subscriptions error:', error);
        return res.status(500).json({ error: error.message });
    }
};
