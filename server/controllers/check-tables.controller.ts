import { createClient } from '@supabase/supabase-js';

export const checkTables = async (req: any, res: any) => {
    try {
        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        const { data: tables, error } = await supabaseAdmin.rpc('get_tables_info');

        // Manual check by fetching 1 row
        const checkDesign = await supabaseAdmin.from('design_requests').select('id').limit(1);
        const checkNotifications = await supabaseAdmin.from('notifications').select('id').limit(1);

        return res.status(200).json({
            design_requests_exists: !checkDesign.error,
            design_requests_error: checkDesign.error,
            notifications_exists: !checkNotifications.error,
            notifications_error: checkNotifications.error
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}