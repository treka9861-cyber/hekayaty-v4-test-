import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/edge/leaderboard
 * Fetches the top accounts from the account_leaderboard_cache.
 * Excludes hidden accounts.
 */
export const getLeaderboard = async (req: any, res: any) => {
    try {
        const supabase = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        const limit = parseInt(req.query.limit) || 100;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        // Check if leaderboard is active globally
        const { data: setting } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'is_leaderboard_active')
            .single();

        if (setting && setting.value === false) {
            return res.status(200).json({
                success: true,
                data: [],
                meta: { total: 0, page: 1, limit, totalPages: 0 },
                isHiddenGlobally: true
            });
        }

        // Fetch leaderboard entries without join to avoid PostgREST foreign key errors
        const { data: leaderboardData, error: leaderboardError, count } = await supabase
            .from('account_leaderboard_cache')
            .select('*', { count: 'exact' })
            .eq('is_hidden', false)
            .order('rank', { ascending: true })
            .range(offset, offset + limit - 1);

        if (leaderboardError) {
            console.error('[GetLeaderboard] Query error:', leaderboardError);
            throw new Error('Failed to fetch leaderboard');
        }

        if (!leaderboardData || leaderboardData.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                meta: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) }
            });
        }

        // Fetch user details for these entries
        const userIds = leaderboardData.map((item: any) => item.user_id);
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url, is_verified, role')
            .in('id', userIds);

        if (usersError) {
            console.error('[GetLeaderboard] Users fetch error:', usersError);
        }

        // Map users by ID for quick lookup
        const userMap: Record<string, any> = {};
        usersData?.forEach((user: any) => {
            userMap[user.id] = user;
        });

        // Format data
        const formattedData = leaderboardData.map((item: any) => {
            const user = userMap[item.user_id] || {};
            return {
                rank: item.rank,
                followersCount: item.followers_count,
                booksCount: item.books_count,
                salesCount: item.sales_count || 0,
                avgRating: item.avg_rating || 0,
                user: {
                    id: user.id || item.user_id,
                    username: user.username || 'unknown',
                    displayName: user.display_name || 'Unknown User',
                    avatarUrl: user.avatar_url,
                    isVerified: user.is_verified,
                    role: user.role
                }
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedData,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error: any) {
        console.error('[GetLeaderboard] error:', error);
        return res.status(500).json({ error: error.message });
    }
};
