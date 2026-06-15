import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/edge/approve-book-claim
 * Publisher approves a book claim request.
 * - Creates a record in book_authors
 * - Updates claim status to approved
 * - Notifies the author
 */
export const approveBookClaim = async (req: any, res: any) => {
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

        const { claim_id } = req.body;
        if (!claim_id) return res.status(400).json({ error: 'claim_id is required' });

        // 2. Fetch the claim
        const { data: claim, error: claimError } = await supabaseAdmin
            .from('book_claim_requests')
            .select('*, book:products(id, title, writer_id)')
            .eq('id', claim_id)
            .single();

        if (claimError || !claim) return res.status(404).json({ error: 'Claim not found' });

        // 3. Security: must be the publisher of the book
        if ((claim.book as any)?.writer_id !== authUser.id) {
            return res.status(403).json({ error: 'Forbidden: You are not the publisher of this book' });
        }

        if (claim.status !== 'pending') {
            return res.status(400).json({ error: `Claim is already ${claim.status}` });
        }

        // 4. Create the book_authors link
        const { error: linkError } = await supabaseAdmin
            .from('book_authors')
            .upsert({
                book_id: claim.book_id,
                author_user_id: claim.user_id,
                linked_by_publisher_id: authUser.id,
                role: claim.requested_role || 'author',
            }, { onConflict: 'book_id,author_user_id' });

        if (linkError) throw linkError;

        // 5. Update claim status
        const { error: updateError } = await supabaseAdmin
            .from('book_claim_requests')
            .update({
                status: 'approved',
                reviewed_by: authUser.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', claim_id);

        if (updateError) throw updateError;

        // 6. Notify the author
        await supabaseAdmin.from('notifications').insert({
            user_id: claim.user_id,
            type: 'book_claim_approved',
            title: 'تمت الموافقة على طلب الملكية ✅',
            content: `تمت الموافقة على طلبك لكتاب "${(claim.book as any)?.title}". الكتاب الآن يظهر في ملفك الشخصي العام.`,
            priority: 'high',
            data: JSON.stringify({ book_id: claim.book_id, claim_id }),
        });

        return res.status(200).json({ success: true, message: 'Claim approved and author linked to book.' });
    } catch (error: any) {
        console.error('approve-book-claim error:', error);
        return res.status(500).json({ error: error.message });
    }
};
