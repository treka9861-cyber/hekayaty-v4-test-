import { createClient } from '@supabase/supabase-js';

console.log("Seller orders function starting...")

export const sellerOrders = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) throw new Error('Unauthorized: Missing token')

        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Unauthorized: Invalid session')
        }

        console.log('Fetching seller orders for user:', user.id)

        // Get order items for this creator
        const { data: orderItems, error } = await supabaseAdmin
            .from('order_items')
            .select(`
        *,
        order:orders (
          id,
          created_at,
          status,
          shipping_address,
          user_id
        ),
        product:products (title, cover_url, type)
      `)
            .eq('creator_id', user.id)

        if (error) {
            console.error('Supabase query error:', error)
            throw new Error('Failed to fetch seller orders: ' + error.message)
        }

        // Fetch users manually to avoid PostgREST nested join issues
        const userIds = Array.from(new Set(orderItems?.map(item => item.order?.user_id).filter(Boolean)));
        const { data: users } = await supabaseAdmin.from('users').select('id, display_name, email').in('id', userIds);
        const usersMap = new Map(users?.map(u => [u.id, u]));

        // Attach user info and sort in memory
        const formattedItems = orderItems?.map(item => ({
            ...item,
            order: {
                ...item.order,
                user: usersMap.get(item.order?.user_id)
            }
        })).sort((a, b) => new Date(b.order?.created_at || 0).getTime() - new Date(a.order?.created_at || 0).getTime());

        console.log(`Found ${formattedItems?.length || 0} order items`)

        return res.status(200).json(formattedItems || [])

    } catch (error: any) {
        console.error('Seller orders error:', error)
        return res.status(500).json({ error: error.message })
    }
}