import { createClient } from '@supabase/supabase-js';
import { calculateCommission } from '../utils/financial';

export const checkout = async (req: any, res: any) => {
    // Handle CORS
    

    try {
        console.log("Request method:", req.method)

        const authHeader = (req.headers.authorization || req.headers.Authorization)
        if (!authHeader) throw new Error('Unauthorized: Missing token')

        const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

        // Create admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // Verify user with token explicitly (proven method in this project)
        const token = authHeader.replace(/Bearer /i, '')
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !authUser) {
            console.error('Auth verification failed:', authError?.message || 'No user found')
            return res.status(401).json({
                    error: 'Unauthorized: Invalid session',
                    details: authError?.message || 'No user found'
                })
        }

        const user = authUser;
        console.log('✅ User verified:', user.id)

        // Parse request body
        const body = req.body
        const {
            items,
            totalAmount,
            paymentMethod,
            paymentProofUrl,
            paymentReference,
            shippingAddress,
            shippingCost = 0,
            shippingBreakdown = []
        } = body

        console.log('Processing checkout for user:', user.id, 'items:', items?.length)

        // 1. Separate products and collections
        const productIds = items.filter((i: any) => i.productId).map((i: any) => i.productId)
        const collectionIds = items.filter((i: any) => i.collectionId).map((i: any) => i.collectionId)
        const variantIds = items.map((i: any) => i.variantId).filter(Boolean)

        console.log(`Fetching ${productIds.length} products and ${collectionIds.length} collections`)

        // 2. Fetch all required data
        const [productsRes, collectionsRes, variantsRes] = await Promise.all([
            productIds.length > 0
                ? supabaseAdmin.from('products').select('*').in('id', productIds)
                : Promise.resolve({ data: [] }),
            collectionIds.length > 0
                ? supabaseAdmin.from('collections').select('*').in('id', collectionIds)
                : Promise.resolve({ data: [] }),
            variantIds.length > 0
                ? supabaseAdmin.from('product_variants').select('id, product_id, price').in('id', variantIds)
                : Promise.resolve({ data: [] })
        ])

        const productsData = productsRes.data || []
        const collectionsData = collectionsRes.data || []
        const variantsData = variantsRes.data || []

        const productMap = new Map(productsData.map((p: any) => [p.id, p]))
        const collectionMap = new Map(collectionsData.map((c: any) => [c.id, c]))
        const variantMap = new Map(variantsData.map((v: any) => [v.id, v]))

        // 3. (Legacy) Fetch Creator Rates - Removed
        // As per the new unified financial rules, all products have a strict 20% platform fee.
        // Custom user commission rates and physical product rates are no longer used.

        // 4. Calculate fees and totals
        let serverCalculatedTotalAmount = 0
        let totalPlatformFee = 0
        let totalCreatorEarnings = 0
        const earningsByCreator = new Map<string, number>()

        const verifiedItems = items.map((item: any) => {
            let actualPrice = 0
            let creatorId = ''
            let isPhysical = false

            if (item.productId) {
                const product = productMap.get(item.productId) as any
                if (!product) throw new Error(`Product ${item.productId} no longer exists.`)

                actualPrice = product.price
                creatorId = product.writer_id
                isPhysical = (product.type === 'physical' || product.type === 'merchandise')

                if (item.variantId) {
                    const variant = variantMap.get(item.variantId) as any
                    if (variant && variant.product_id === item.productId) {
                        actualPrice = variant.price
                    }
                }
            } else if (item.collectionId) {
                const collection = collectionMap.get(item.collectionId) as any
                if (!collection) throw new Error(`Collection ${item.collectionId} no longer exists.`)

                actualPrice = Number(collection.price) || 0
                creatorId = collection.writer_id
                isPhysical = false
            } else {
                throw new Error('Invalid cart item: No product or collection ID')
            }

            const quantity = Number(item.quantity) || 1
            const itemTotal = Number(actualPrice) * quantity
            serverCalculatedTotalAmount += itemTotal

            const { fee, earning } = calculateCommission(itemTotal);

            totalPlatformFee += fee
            totalCreatorEarnings += earning

            const currentEarning = earningsByCreator.get(creatorId) || 0
            earningsByCreator.set(creatorId, currentEarning + earning)

            return {
                ...item,
                price: actualPrice,
                creatorId: creatorId
            }
        })

        // 5. Add shipping to creator earnings
        if (shippingBreakdown && Array.isArray(shippingBreakdown)) {
            for (const ship of shippingBreakdown) {
                const current = earningsByCreator.get(ship.creatorId) || 0
                earningsByCreator.set(ship.creatorId, current + (ship.amount || 0))
                totalCreatorEarnings += (ship.amount || 0)
            }
        }

        // 6. Split into Physical and Digital groups
        const physicalItemsList = verifiedItems.filter((item: any) => {
            if (item.productId) {
                const product = productMap.get(item.productId) as any
                return (product.type === 'physical' || product.type === 'merchandise' || product.requires_shipping)
            }
            return false
        })
        const digitalItemsList = verifiedItems.filter((item: any) => {
            if (item.productId) {
                const product = productMap.get(item.productId) as any
                return !(product.type === 'physical' || product.type === 'merchandise' || product.requires_shipping)
            }
            return !!item.collectionId
        })

        const hasPhysical = physicalItemsList.length > 0
        const hasDigital = digitalItemsList.length > 0
        const isMixed = hasPhysical && hasDigital

        // 7. Determine initial status
        const isManualPayment = [
            "instapay",
            "vodafone_cash",
            "orange_cash",
            "etisalat_cash",
            "bank_transfer"
        ].includes(paymentMethod)
        const initialStatus = isManualPayment ? "pending" : "paid"

        const createdOrders: any[] = []

        // Helper to create an order
        const createSubOrder = async (subItems: any[], subShippingCost: number = 0, isPhysicalOrder: boolean = false) => {
            let subTotal = 0
            let subPlatformFee = 0
            let subCreatorEarnings = 0
            const subEarningsByCreator = new Map<string, number>()

            subItems.forEach((item: any) => {
                const itemTotal = item.price * (item.quantity || 1)
                subTotal += itemTotal

                const product = item.productId ? productMap.get(item.productId) as any : null
                const isItemPhysical = product ? (product.type === 'physical' || product.type === 'merchandise' || product.requires_shipping) : false

                const { fee, earning } = calculateCommission(itemTotal);

                subPlatformFee += fee
                subCreatorEarnings += earning

                const current = subEarningsByCreator.get(item.creatorId) || 0
                subEarningsByCreator.set(item.creatorId, current + earning)
            })

            // Add shipping to creator earnings if it's the physical order
            if (isPhysicalOrder && shippingBreakdown && Array.isArray(shippingBreakdown)) {
                for (const ship of shippingBreakdown) {
                    const current = subEarningsByCreator.get(ship.creatorId) || 0
                    subEarningsByCreator.set(ship.creatorId, current + (ship.amount || 0))
                    subCreatorEarnings += (ship.amount || 0)
                }
            }

            const { data: order, error: orderError } = await supabaseAdmin
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_amount: subTotal + subShippingCost,
                    platform_fee: subPlatformFee,
                    creator_earnings: subCreatorEarnings,
                    status: initialStatus,
                    payment_method: paymentMethod,
                    payment_proof_url: paymentProofUrl,
                    payment_reference: paymentReference,
                    shipping_address: isPhysicalOrder ? shippingAddress : null,
                    shipping_cost: subShippingCost,
                    is_verified: !isManualPayment
                })
                .select()
                .single()

            if (orderError) throw orderError

            // Create items for this order
            const orderItemsToInsert = subItems.map((item: any) => ({
                order_id: order.id,
                product_id: item.productId || null,
                collection_id: item.collectionId || null,
                variant_id: item.variantId || null,
                price: item.price,
                quantity: item.quantity || 1,
                creator_id: item.creatorId,
                fulfillment_status: isPhysicalOrder ? 'pending' : 'delivered', // Digital is auto-delivered if paid/pending verification
                license_type: 'standard',
                customization_data: item.customizationData || {}
            }))

            const { error: itemsError } = await supabaseAdmin
                .from('order_items')
                .insert(orderItemsToInsert)

            if (itemsError) throw itemsError

            return order
        }

        // Handle Splitting
        if (hasPhysical) {
            const pOrder = await createSubOrder(physicalItemsList, shippingCost, true)
            createdOrders.push(pOrder)
        }

        if (hasDigital) {
            const dOrder = await createSubOrder(digitalItemsList, 0, false)
            createdOrders.push(dOrder)
        }

        // 9. Atomic Stock Decrementing (Only for physical)
        for (const item of physicalItemsList) {
            if (item.productId) {
                const { error: stockError } = await supabaseAdmin.rpc('decrement_product_stock', {
                    p_product_id: item.productId,
                    p_quantity: item.quantity || 1
                })
                if (stockError) console.error('Stock decrement failed:', stockError)
            }
        }

        // 10. Clear ONLY the specific items that were processed in this order
        for (const item of verifiedItems) {
            if (item.productId) {
                await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id).eq('product_id', item.productId)
            } else if (item.collectionId) {
                await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id).eq('collection_id', item.collectionId)
            }
        }

        console.log('Checkout completed successfully with', createdOrders.length, 'orders')

        return res.status(201).json({ orders: createdOrders, success: true })

    } catch (error: any) {
        console.error('Checkout error:', error)
        return res.status(500).json({ error: error.message })
    }
}