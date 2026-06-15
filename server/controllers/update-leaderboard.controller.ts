import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/update-leaderboard
 * Calculates and caches the top accounts leaderboard.
 * Ranking is based on 4 factors (in order of priority):
 *   1. followers_count DESC
 *   2. books_count DESC
 *   3. sales_count DESC
 *   4. avg_rating DESC
 *
 * Triggered via Vercel Cron or manually by an Admin.
 */
export const updateLeaderboard = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // Security check: Allow if it's an admin OR if the correct CRON_SECRET is provided
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const cronSecret = process.env['CRON_SECRET'];
        let isAdmin = false;

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');

            // Check if it matches CRON_SECRET
            if (cronSecret && token === cronSecret) {
                isAdmin = true;
            } else {
                // Check if user is admin
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

        console.log('[LeaderboardCron] Starting top accounts ranking calculation (4-factor)...');

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

        const rankings: any[] = [];

        // Process in chunks to avoid overwhelming the DB connection pool
        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            const promises = chunk.map(async (u) => {
                // === FACTOR 1: Followers ===
                const { count: followersCount } = await supabaseAdmin
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', u.id);

                // === FACTOR 2: Books ===
                // Own published books
                const { count: ownBooksCount } = await supabaseAdmin
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('writer_id', u.id)
                    .eq('is_published', true);

                // Co-authored published books
                const { data: authoredLinks } = await supabaseAdmin
                    .from('book_authors')
                    .select('book:book_id(is_published)')
                    .eq('author_user_id', u.id);

                const publishedAuthoredBooks = authoredLinks
                    ?.map((l: any) => l.book)
                    .filter((b: any) => b && b.is_published === true) || [];

                const totalBooksCount = (ownBooksCount || 0) + publishedAuthoredBooks.length;

                // === FACTOR 3: Total Sales ===
                // Count all completed/delivered order_items where this user is the creator
                const { count: salesCount } = await supabaseAdmin
                    .from('order_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', u.id);

                // === FACTOR 4: Average Rating ===
                // Get all published products by this user and calculate average rating
                const { data: userProducts } = await supabaseAdmin
                    .from('products')
                    .select('rating, review_count')
                    .eq('writer_id', u.id)
                    .eq('is_published', true);

                let avgRating = 0;
                if (userProducts && userProducts.length > 0) {
                    const totalWeightedRating = userProducts.reduce(
                        (sum: number, p: any) => sum + (p.rating || 0) * (p.review_count || 0),
                        0
                    );
                    const totalReviews = userProducts.reduce(
                        (sum: number, p: any) => sum + (p.review_count || 0),
                        0
                    );
                    avgRating = totalReviews > 0 ? totalWeightedRating / totalReviews : 0;
                }

                return {
                    user_id: u.id,
                    followers_count: followersCount || 0,
                    books_count: totalBooksCount,
                    sales_count: salesCount || 0,
                    avg_rating: Math.round(avgRating * 100) / 100, // round to 2 decimal places
                    account_created_at: u.created_at,
                };
            });

            const results = await Promise.all(promises);
            rankings.push(...results);
        }

        // Sort rankings by 4 factors:
        // 1. followers_count DESC
        // 2. books_count DESC
        // 3. sales_count DESC
        // 4. avg_rating DESC
        rankings.sort((a, b) => {
            if (b.followers_count !== a.followers_count) return b.followers_count - a.followers_count;
            if (b.books_count !== a.books_count) return b.books_count - a.books_count;
            if (b.sales_count !== a.sales_count) return b.sales_count - a.sales_count;
            if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
            // Final tie-breaker: older account wins
            const dateA = new Date(a.account_created_at).getTime();
            const dateB = new Date(b.account_created_at).getTime();
            return dateA - dateB;
        });

        // Clear old rankings and insert new ones
        await supabaseAdmin.from('account_leaderboard_cache').delete().neq('id', 0);

        // Insert new rankings with rank assigned
        const recordsToInsert = rankings.map((r, index) => ({
            user_id: r.user_id,
            rank: index + 1,
            followers_count: r.followers_count,
            books_count: r.books_count,
            sales_count: r.sales_count,
            avg_rating: r.avg_rating,
            views_count: 0, // kept for schema compatibility
            account_created_at: r.account_created_at,
            calculated_at: new Date().toISOString(),
            is_hidden: false
        }));

        if (recordsToInsert.length > 0) {
            for (let i = 0; i < recordsToInsert.length; i += 100) {
                const { error: insertError } = await supabaseAdmin
                    .from('account_leaderboard_cache')
                    .insert(recordsToInsert.slice(i, i + 100));

                if (insertError) throw insertError;
            }
        }

        console.log(`[LeaderboardCron] Successfully updated leaderboard with ${recordsToInsert.length} records (4-factor ranking).`);
        return res.status(200).json({ success: true, count: recordsToInsert.length });
    } catch (error: any) {
        console.error('[LeaderboardCron] error:', error);
        return res.status(500).json({ error: error.message });
    }
};
