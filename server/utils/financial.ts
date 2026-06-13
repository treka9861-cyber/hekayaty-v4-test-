export const PLATFORM_FEE_PERCENTAGE = 20;

/**
 * Calculates the strict, unified platform fee (20%) and creator earning for a given amount.
 * As per the new business rules, ALL products (physical, digital, etc) are subject to this 
 * exact same 20% fee. No exceptions.
 * 
 * @param amount The total gross amount of the item/transaction
 * @returns An object containing the calculated `fee` and `earning`
 */
export function calculateCommission(amount: number): { fee: number, earning: number } {
    const fee = Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100));
    const earning = amount - fee;
    
    return { fee, earning };
}
