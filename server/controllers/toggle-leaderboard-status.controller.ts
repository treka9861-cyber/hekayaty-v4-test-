import { createClient } from '@supabase/supabase-js';

export const toggleLeaderboardStatus = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // Security check: Allow only if user is admin
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let isAdmin = false;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (!authError && authUser) {
                const { data: userData } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('id', authUser.id)
                    .single();
                
                if (userData?.role === 'admin') {
                    isAdmin = true;
                }
            }
        }

        if (!isAdmin) {
            return res.status(401).json({ error: 'Unauthorized: Admin required' });
        }

        const { isActive } = req.body;

        const { error } = await supabaseAdmin
            .from('platform_settings')
            .upsert({ key: 'is_leaderboard_active', value: isActive });

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, isActive });
    } catch (error: any) {
        console.error('[ToggleLeaderboardStatus] error:', error);
        return res.status(500).json({ error: error.message });
    }
};
