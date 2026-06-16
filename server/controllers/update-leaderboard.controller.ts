import { createClient } from '@supabase/supabase-js';

export const updateLeaderboard = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // Security check
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const cronSecret = process.env['CRON_SECRET'];
        let isAdmin = false;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            if (cronSecret && token === cronSecret) {
                isAdmin = true;
            } else {
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
        }

        if (!isAdmin) {
            return res.status(401).json({ error: 'Unauthorized: Admin or valid CRON_SECRET required' });
        }

        console.log('[LeaderboardCron] Starting Rankings Hub calculation...');

        // Fetch settings
        const { data: settings } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'ranking_min_ratings')
            .single();
        
        const minRatings = settings?.value ? parseInt(settings.value.toString()) : 20;

        // 1. Fetch all active users
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, created_at')
            .in('status', ['active'])
            .in('role', ['writer', 'publisher', 'reader']);

        if (usersError || !users) {
            throw new Error('Failed to fetch users');
        }

        console.log(`[LeaderboardCron] Found ${users.length} active users.`);

        const allUserStats: any[] = [];

        // Process in chunks to avoid overwhelming the DB connection pool
        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            const promises = chunk.map(async (u) => {
                // Followers
                const { count: followersCount } = await supabaseAdmin
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', u.id);

                // Books
                const { count: ownBooksCount } = await supabaseAdmin
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('writer_id', u.id)
                    .eq('is_published', true);

                const { data: authoredLinks } = await supabaseAdmin
                    .from('book_authors')
                    .select('book:book_id(is_published)')
                    .eq('author_user_id', u.id);

                const publishedAuthoredBooks = authoredLinks
                    ?.map((l: any) => l.book)
                    .filter((b: any) => b && b.is_published === true) || [];

                const totalBooksCount = (ownBooksCount || 0) + publishedAuthoredBooks.length;

                // Ratings
                const { data: userProducts } = await supabaseAdmin
                    .from('products')
                    .select('rating, review_count')
                    .eq('writer_id', u.id)
                    .eq('is_published', true);

                let avgRating = 0;
                let ratingsCount = 0;
                if (userProducts && userProducts.length > 0) {
                    const totalWeightedRating = userProducts.reduce(
                        (sum: number, p: any) => sum + (p.rating || 0) * (p.review_count || 0),
                        0
                    );
                    ratingsCount = userProducts.reduce(
                        (sum: number, p: any) => sum + (p.review_count || 0),
                        0
                    );
                    avgRating = ratingsCount > 0 ? (totalWeightedRating / ratingsCount) / 10 : 0;
                }

                return {
                    user_id: u.id,
                    followers_count: followersCount || 0,
                    books_count: totalBooksCount,
                    avg_rating: Math.round(avgRating * 100) / 100,
                    ratings_count: ratingsCount,
                    account_created_at: u.created_at,
                };
            });

            const results = await Promise.all(promises);
            allUserStats.push(...results);
        }

        const now = new Date().toISOString();

        // --- Most Followed ---
        const mostFollowed = [...allUserStats].sort((a, b) => {
            if (b.followers_count !== a.followers_count) return b.followers_count - a.followers_count;
            if (b.books_count !== a.books_count) return b.books_count - a.books_count;
            return new Date(a.account_created_at).getTime() - new Date(b.account_created_at).getTime();
        });
        await supabaseAdmin.from('ranking_most_followed_cache').delete().neq('id', 0);
        const mostFollowedRecords = mostFollowed.map((r, i) => ({
            user_id: r.user_id,
            rank: i + 1,
            followers_count: r.followers_count,
            books_count: r.books_count,
            account_created_at: r.account_created_at,
            calculated_at: now,
            is_hidden: false
        }));
        await bulkInsert(supabaseAdmin, 'ranking_most_followed_cache', mostFollowedRecords);

        // --- Highest Rated ---
        const highestRated = [...allUserStats].filter(u => u.ratings_count >= minRatings).sort((a, b) => {
            if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
            if (b.ratings_count !== a.ratings_count) return b.ratings_count - a.ratings_count;
            return b.followers_count - a.followers_count;
        });
        await supabaseAdmin.from('ranking_highest_rated_cache').delete().neq('id', 0);
        const highestRatedRecords = highestRated.map((r, i) => ({
            user_id: r.user_id,
            rank: i + 1,
            avg_rating: r.avg_rating,
            ratings_count: r.ratings_count,
            followers_count: r.followers_count,
            calculated_at: now,
            is_hidden: false
        }));
        await bulkInsert(supabaseAdmin, 'ranking_highest_rated_cache', highestRatedRecords);

        // --- Most Books ---
        const mostBooks = [...allUserStats].sort((a, b) => {
            if (b.books_count !== a.books_count) return b.books_count - a.books_count;
            return b.followers_count - a.followers_count;
        });
        await supabaseAdmin.from('ranking_most_books_cache').delete().neq('id', 0);
        const mostBooksRecords = mostBooks.map((r, i) => ({
            user_id: r.user_id,
            rank: i + 1,
            books_count: r.books_count,
            followers_count: r.followers_count,
            calculated_at: now,
            is_hidden: false
        }));
        await bulkInsert(supabaseAdmin, 'ranking_most_books_cache', mostBooksRecords);

        // Keep the old account_leaderboard_cache table updated for backward compatibility (just mirroring Most Followed logic)
        await supabaseAdmin.from('account_leaderboard_cache').delete().neq('id', 0);
        await bulkInsert(supabaseAdmin, 'account_leaderboard_cache', mostFollowedRecords.map(r => ({
            ...r,
            views_count: 0,
        })));

        console.log(`[LeaderboardCron] Successfully updated 3 Rankings Hub caches.`);
        return res.status(200).json({ success: true, count: allUserStats.length });
    } catch (error: any) {
        console.error('[LeaderboardCron] error:', error);
        return res.status(500).json({ error: error.message });
    }
};

async function bulkInsert(supabaseAdmin: any, table: string, records: any[]) {
    if (records.length === 0) return;
    for (let i = 0; i < records.length; i += 100) {
        const { error } = await supabaseAdmin.from(table).insert(records.slice(i, i + 100));
        if (error) throw error;
    }
}
