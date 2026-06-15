import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/cron/update-leaderboard
 * Calculates and caches the top accounts leaderboard.
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

        console.log('[LeaderboardCron] Starting top accounts ranking calculation...');

        // 1. Fetch all public, active users
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, created_at')
            .in('status', ['active'])
            .in('role', ['writer', 'publisher', 'reader']); // Everyone is eligible

        if (usersError || !users) {
            throw new Error('Failed to fetch users');
        }

        console.log(`[LeaderboardCron] Found ${users.length} active users.`);

        const rankings = [];

        // Note: For a massive scale, doing this in a single SQL query or RPC would be better.
        // For standard scale, doing concurrent counts is acceptable.
        // We'll process in chunks to avoid overwhelming the database connection pool.
        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            const promises = chunk.map(async (u) => {
                // Get followers
                const { count: followersCount } = await supabaseAdmin
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', u.id);

                // Get published books directly
                const { count: productsCount } = await supabaseAdmin
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('writer_id', u.id)
                    .neq('is_published', false);

                // Get co-authored books
                const { data: authoredLinks } = await supabaseAdmin
                    .from('book_authors')
                    .select('book:book_id(is_published)')
                    .eq('author_user_id', u.id);

                const publishedAuthoredBooks = authoredLinks?.map((l: any) => l.book).filter((b: any) => b && b.is_published !== false) || [];
                const totalBooksCount = (productsCount || 0) + publishedAuthoredBooks.length;

                // Profile views (placeholder for now, defaults to 0 as requested)
                const viewsCount = 0;

                return {
                    user_id: u.id,
                    followers_count: followersCount || 0,
                    books_count: totalBooksCount,
                    views_count: viewsCount,
                    account_created_at: u.created_at,
                };
            });

            const results = await Promise.all(promises);
            rankings.push(...results);
        }

        // Sort rankings:
        // 1. followers_count DESC
        // 2. books_count DESC
        // 3. views_count DESC
        // 4. account_created_at ASC
        rankings.sort((a, b) => {
            if (b.followers_count !== a.followers_count) return b.followers_count - a.followers_count;
            if (b.books_count !== a.books_count) return b.books_count - a.books_count;
            if (b.views_count !== a.views_count) return b.views_count - a.views_count;
            // older accounts win ties
            const dateA = new Date(a.account_created_at).getTime();
            const dateB = new Date(b.account_created_at).getTime();
            return dateA - dateB;
        });

        // Clear old rankings and insert new ones
        await supabaseAdmin.from('account_leaderboard_cache').delete().neq('id', 0); // Delete all

        // Insert new rankings with rank assigned
        const recordsToInsert = rankings.map((r, index) => ({
            user_id: r.user_id,
            rank: index + 1,
            followers_count: r.followers_count,
            books_count: r.books_count,
            views_count: r.views_count,
            account_created_at: r.account_created_at,
            calculated_at: new Date().toISOString(),
            is_hidden: false
        }));

        if (recordsToInsert.length > 0) {
            // Chunk inserts
            for (let i = 0; i < recordsToInsert.length; i += 100) {
                const { error: insertError } = await supabaseAdmin
                    .from('account_leaderboard_cache')
                    .insert(recordsToInsert.slice(i, i + 100));
                
                if (insertError) throw insertError;
            }
        }

        console.log(`[LeaderboardCron] Successfully updated leaderboard with ${recordsToInsert.length} records.`);
        return res.status(200).json({ success: true, count: recordsToInsert.length });
    } catch (error: any) {
        console.error('[LeaderboardCron] error:', error);
        return res.status(500).json({ error: error.message });
    }
};
