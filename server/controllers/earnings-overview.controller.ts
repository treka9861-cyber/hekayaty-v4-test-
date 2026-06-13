import { createClient } from '@supabase/supabase-js';
import { calculateCommission } from '../utils/financial';

console.log("Earnings overview function starting...")

export const earningsOverview = async (req: any, res: any) => {
    

    try {
        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) {
            console.error("❌ Missing Authorization header")
            throw new Error('Unauthorized: Missing token')
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        console.log("📡 Verifying token...")
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            console.error('❌ Auth verification failed:', authError?.message || 'No user found')
            return res.status(401).json({ error: 'Unauthorized: Invalid session', details: authError?.message })
        }

        let userId = authUser.id;
        console.log('✅ User verified:', userId)

        // Allow admin to override userId if provided in query (for debugging/support)
        const overrideId = req.query?.userId as string | undefined
        if (overrideId && overrideId !== userId) {
            const { data: adminUser } = await supabaseAdmin.from('users').select('role').eq('id', userId).single()
            if (adminUser?.role === 'admin') {
                console.log(`👑 Admin override: Fetching for ${overrideId} instead of ${userId}`)
                userId = overrideId
            }
        }

        console.log(`📊 Fetching data for creator: ${userId}`)

        // Fetch everything
        const [
            { data: earningsRecords, error: eError },
            { data: orderItems, error: oiError },
            { data: payouts, error: pError },
            { data: products, error: prError },
            { data: user, error: uError }
        ] = await Promise.all([
            supabaseAdmin.from('earnings').select('*').eq('creator_id', userId),
            supabaseAdmin.from('order_items').select('id, price, quantity, order_id, product_id').eq('creator_id', userId),
            supabaseAdmin.from('payouts').select('*').eq('user_id', userId).order('requested_at', { ascending: false }),
            supabaseAdmin.from('products').select('id, price, sales_count, type').eq('writer_id', userId),
            supabaseAdmin.from('users').select('id, commission_rate').eq('id', userId).single()
        ])

        if (eError || oiError || pError || prError || uError) {
            console.error("❌ Database fetch error:", { eError, oiError, pError, prError, uError })
        }

        // As per new business rules: Custom commission rates and physical product overrides are removed.
        // ALL products are strictly subject to a unified 20% platform fee.
        
        console.log(`📈 Applying strict unified 20% platform fee to all calculations.`);

        const productTypeMap = new Map(products?.map(p => [p.id, p.type]) || []);

        // 1. Calculate Gross and Net from Orders
        const orderIds = orderItems?.map(i => i.order_id).filter(Boolean) || [];
        const { data: orders } = orderIds.length > 0
            ? await supabaseAdmin.from('orders').select('id, status').in('id', orderIds)
            : { data: [] };

        const paidOrderIds = new Set(orders?.filter(o => o.status === 'paid').map(o => o.id) || []);
        
        let transGross = 0;
        let transUnits = 0;
        let transNet = 0;

        orderItems?.filter(i => paidOrderIds.has(i.order_id)).forEach(i => {
            const itemTotal = (i.price || 0) * (i.quantity || 1);
            transGross += itemTotal;
            transUnits += (i.quantity || 1);
            
            const { fee, earning } = calculateCommission(itemTotal);
            transNet += earning;
        });

        console.log(`📦 Transaction data: Gross=${transGross}, Net=${transNet}, Units=${transUnits}`)

        // 2. Calculate Gross and Net from Legacy Products
        const legacyUnits = products?.reduce((sum, p) => sum + (p.sales_count || 0), 0) || 0;
        let legacyGross = 0;
        let legacyNet = 0;
        
        products?.forEach(p => {
            const pTotal = (p.price || 0) * (p.sales_count || 0);
            legacyGross += pTotal;
            
            const { fee, earning } = calculateCommission(pTotal);
            legacyNet += earning;
        });

        console.log(`📜 Legacy data: Gross=${legacyGross}, Net=${legacyNet}, Units=${legacyUnits}`)

        // 3. FINAL AGGREGATION (Fallback to legacy if it's larger - handles old DB state)
        const useLegacy = legacyGross > transGross;
        const finalGross = useLegacy ? legacyGross : transGross;
        const finalUnits = useLegacy ? legacyUnits : transUnits;
        const finalNet = useLegacy ? legacyNet : transNet;

        const totalCommission = finalGross - finalNet;

        // Payouts
        const totalPaidOut = payouts?.filter(p => p.status === 'processed').reduce((sum, p) => sum + p.amount, 0) || 0;
        const pendingPayouts = payouts?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
        const availableBalance = finalNet - totalPaidOut - pendingPayouts;

        const responseData = {
            totalEarnings: finalNet,
            totalGross: finalGross,
            totalUnitsSold: finalUnits,
            totalCommission,
            totalPaidOut,
            pendingPayouts,
            availableBalance: Math.max(0, availableBalance),
            recentEarnings: earningsRecords?.slice(0, 10) || [],
            payoutHistory: payouts || [],
            debug: {
                userId,
                paidOrdersCount: paidOrderIds.size,
                itemsFound: orderItems?.length || 0,
                earningsRecordsFound: earningsRecords?.length || 0
            }
        };

        console.log("✅ Success returning earnings overview")

        return res.status(200).json(responseData);

    } catch (error: any) {
        console.error('❌ Earnings overview error:', error)
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
}