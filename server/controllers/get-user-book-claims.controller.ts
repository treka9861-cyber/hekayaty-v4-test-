import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/edge/get-user-book-claims
 * Returns all book claims submitted by the currently logged-in user (author view).
 */
export const getUserBookClaims = async (req: any, res: any) => {
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

        // Fetch author's claims
        const { data: claims, error } = await supabaseAdmin
            .from('book_claim_requests')
            .select('*')
            .eq('user_id', authUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!claims || claims.length === 0) {
            return res.status(200).json({ claims: [] });
        }

        // Enrich with book info
        const bookIds = claims.map((c: any) => c.book_id);
        const { data: books } = await supabaseAdmin
            .from('products')
            .select('id, title, cover_url, genre')
            .in('id', bookIds);

        const booksMap = Object.fromEntries((books || []).map((b: any) => [b.id, b]));

        const enriched = claims.map((c: any) => ({
            ...c,
            book: booksMap[c.book_id] || null,
        }));

        return res.status(200).json({ claims: enriched });
    } catch (error: any) {
        console.error('get-user-book-claims error:', error);
        return res.status(500).json({ error: error.message });
    }
};
