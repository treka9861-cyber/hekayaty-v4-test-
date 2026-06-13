import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function testAutoHeal() {
    console.log("Testing auto-heal logic...");
    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: pendingSubs, error } = await supabaseAdmin
        .from('creator_subscriptions')
        .select('id, status, user_id')
        .eq('status', 'pending');

    console.log("Pending subs:", pendingSubs?.length);
    if (!pendingSubs) return;

    for (const sub of pendingSubs) {
        console.log(`Checking sub ${sub.id}`);
        const { data: linkedItems, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select('order_id, customization_data')
            .contains('customization_data', { subscription_id: sub.id });

        console.log(`  linkedItems:`, linkedItems?.length, itemsError);
        
        if (linkedItems && linkedItems.length > 0) {
            const orderIds = linkedItems.map(i => i.order_id);
            console.log(`  orderIds:`, orderIds);
            const { data: verifiedOrders, error: orderError } = await supabaseAdmin
                .from('orders')
                .select('id, is_verified, status')
                .in('id', orderIds)
                .eq('is_verified', true);

            console.log(`  verifiedOrders:`, verifiedOrders?.length, verifiedOrders, orderError);
        } else {
            // Wait, maybe it's not subscription_id inside customization_data, or maybe it's saved differently?
            // Let's fetch all order items that have is_membership
            const { data: anyLinked } = await supabaseAdmin
                .from('order_items')
                .select('order_id, customization_data')
                .contains('customization_data', { is_membership: true });
            
            console.log(`  Fallback check - all membership items:`, anyLinked?.slice(0, 2).map(x => JSON.stringify(x.customization_data)));
        }
    }
}

testAutoHeal().catch(console.error);
