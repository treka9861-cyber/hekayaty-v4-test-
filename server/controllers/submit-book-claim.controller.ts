import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/submit-book-claim
 * Authenticated user submits a claim for a book they authored.
 */
export const submitBookClaim = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        );

        // 1. Auth check
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

        const { book_id, message } = req.body;
        if (!book_id) return res.status(400).json({ error: 'book_id is required' });

        // 2. Fetch the book
        const { data: book, error: bookError } = await supabaseAdmin
            .from('products')
            .select('id, title, writer_id, cover_url')
            .eq('id', book_id)
            .single();

        if (bookError || !book) return res.status(404).json({ error: 'Book not found' });

        // 3. Prevent self-claim (author cannot claim their own book)
        if (book.writer_id === authUser.id) {
            return res.status(400).json({ error: 'You cannot claim your own published book' });
        }

        // 4. Check for existing approved link
        const { data: existingLink } = await supabaseAdmin
            .from('book_authors')
            .select('id')
            .eq('book_id', book_id)
            .eq('author_user_id', authUser.id)
            .maybeSingle();

        if (existingLink) {
            return res.status(409).json({ error: 'You are already linked to this book as an author' });
        }

        // 5. Check for existing pending claim (anti-abuse: DB unique index also prevents this)
        const { data: existingClaim } = await supabaseAdmin
            .from('book_claim_requests')
            .select('id, status')
            .eq('book_id', book_id)
            .eq('user_id', authUser.id)
            .in('status', ['pending'])
            .maybeSingle();

        if (existingClaim) {
            return res.status(409).json({ error: 'You already have a pending claim for this book' });
        }

        // 6. Get claimer info for notification
        const { data: claimer } = await supabaseAdmin
            .from('users')
            .select('display_name, email')
            .eq('id', authUser.id)
            .single();

        // 7. Create the claim request
        const { data: claim, error: claimError } = await supabaseAdmin
            .from('book_claim_requests')
            .insert({
                book_id,
                user_id: authUser.id,
                publisher_id: book.writer_id,
                status: 'pending',
                requested_role: 'author',
                message: message?.trim() || null,
            })
            .select()
            .single();

        if (claimError) throw claimError;

        // 8. Notify the publisher
        await supabaseAdmin.from('notifications').insert({
            user_id: book.writer_id,
            type: 'book_claim_received',
            title: 'طلب ملكية كتاب جديد 📖',
            content: `${claimer?.display_name || 'مستخدم'} يطالب بملكية كتاب "${book.title}". راجع الطلب في لوحة التحكم.`,
            priority: 'high',
            data: JSON.stringify({ book_id, claim_id: claim.id }),
        });

        return res.status(201).json({ success: true, claim });
    } catch (error: any) {
        console.error('submit-book-claim error:', error);
        return res.status(500).json({ error: error.message });
    }
};
