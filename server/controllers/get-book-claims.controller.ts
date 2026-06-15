import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/edge/get-book-claims
 * Publisher fetches all claim requests for their books.
 * Optional query param: ?status=pending|approved|rejected|all
 */
export const getBookClaims = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // 1. Auth
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        const statusFilter = req.query?.status || 'pending';

        // 2. Fetch claims where this user is the publisher
        let query = supabaseAdmin
            .from('book_claim_requests')
            .select('*')
            .eq('publisher_id', authUser.id)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: claims, error: claimsError } = await query;
        if (claimsError) throw claimsError;

        if (!claims || claims.length === 0) {
            return res.status(200).json({ claims: [] });
        }

        // 3. Enrich with book info
        const bookIds = [...new Set(claims.map((c: any) => c.book_id))];
        const { data: books } = await supabaseAdmin
            .from('products')
            .select('id, title, cover_url')
            .in('id', bookIds);

        const booksMap = Object.fromEntries((books || []).map((b: any) => [b.id, b]));

        // 4. Enrich with claimer user info
        const userIds = [...new Set(claims.map((c: any) => c.user_id))];
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, display_name, email, avatar_url')
            .in('id', userIds);

        const usersMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]));

        // 5. Merge everything
        const enriched = claims.map((c: any) => ({
            ...c,
            book: booksMap[c.book_id] || null,
            claimer: usersMap[c.user_id] || null,
        }));

        return res.status(200).json({ claims: enriched });
    } catch (error: any) {
        console.error('get-book-claims error:', error);
        return res.status(500).json({ error: error.message });
    }
};
