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

        const { data, error, count } = await supabase
            .from('account_leaderboard_cache')
            .select(`
                rank,
                followers_count,
                books_count,
                views_count,
                user:users!account_leaderboard_cache_user_id_fkey(
                    id,
                    username,
                    display_name,
                    avatar_url,
                    is_verified,
                    role
                )
            `, { count: 'exact' })
            .eq('is_hidden', false)
            .order('rank', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[GetLeaderboard] Query error:', error);
            throw new Error('Failed to fetch leaderboard');
        }

        // Format data
        const formattedData = data.map((item: any) => ({
            rank: item.rank,
            followersCount: item.followers_count,
            booksCount: item.books_count,
            user: {
                id: item.user?.id,
                username: item.user?.username,
                displayName: item.user?.display_name,
                avatarUrl: item.user?.avatar_url,
                isVerified: item.user?.is_verified,
                role: item.user?.role
            }
        }));

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
