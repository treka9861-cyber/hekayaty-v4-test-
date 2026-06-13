import { createClient } from '@supabase/supabase-js';

console.log("Calculate shipping function starting...")

export const calculateShipping = async (req: any, res: any) => {
    // Handle CORS
    

    try {
        console.log(`Incoming request Headers:`, req.headers)
        const { items, city } = req.body

        if (!city || !items || items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields: items, city' })
        }

        const supabaseAdmin = createClient(
            process.env['SUPABASE_URL'] ?? '',
            process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
        )

        console.log(`Calculating shipping for ${items.length} items to ${city}`)

        // Group items by creator
        const itemsByCreator = new Map<string, any[]>()
        for (const item of items) {
            const creatorId = item.creatorId
            if (!itemsByCreator.has(creatorId)) {
                itemsByCreator.set(creatorId, [])
            }
            itemsByCreator.get(creatorId)!.push(item)
        }

        let totalShipping = 0
        const breakdown: any[] = []

        // Calculate shipping per creator
        for (const [creatorId, creatorItems] of Array.from(itemsByCreator.entries())) {
            // Fetch creator's shipping rates
            const { data: rates, error: ratesError } = await supabaseAdmin
                .from('shipping_rates')
                .select('*')
                .eq('creator_id', creatorId)

            if (ratesError) {
                console.error('Failed to fetch shipping rates:', ratesError)
                // Default to 0 if no rates found
                breakdown.push({
                    creatorId,
                    amount: 0,
                    regionName: 'Unknown',
                    itemCount: creatorItems.length
                })
                continue
            }

            // Find matching rate for the city
            const normalizedCity = city.toLowerCase().trim()
            let matchedRate = rates?.find((r: any) =>
                r.region_name.toLowerCase() === normalizedCity
            )

            // If exact match not found, try to find a "default" or "all" region
            if (!matchedRate) {
                matchedRate = rates?.find((r: any) =>
                    ['default', 'all', 'nationwide'].includes(r.region_name.toLowerCase())
                )
            }

            const shippingAmount = matchedRate?.amount || 0

            totalShipping += shippingAmount
            breakdown.push({
                creatorId,
                amount: shippingAmount,
                regionName: matchedRate?.region_name || 'Not Available',
                deliveryTimeMin: matchedRate?.delivery_time_min,
                deliveryTimeMax: matchedRate?.delivery_time_max,
                itemCount: creatorItems.length
            })
        }

        console.log(`Total shipping: ${totalShipping}`)

        return res.status(200).json({
                total: totalShipping,
                breakdown
            })

    } catch (error: any) {
        console.error('Calculate shipping error:', error)
        return res.status(500).json({ error: error.message })
    }
}