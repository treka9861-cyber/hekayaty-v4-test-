/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { calculateProratedUpgrade } from './upgrade-subscription-preview.controller';

describe('Subscription Upgrade - calculateProratedUpgrade Math', () => {
  it('should calculate full cost when upgrading from zero remaining days', () => {
    const result = calculateProratedUpgrade(
      0, // daysRemaining
      50, // currentPriceInCents (e.g. 0.50 EGP per month, old plan)
      30, // currentCycleDays (monthly)
      300 // targetPriceInCents (e.g. 3.00 EGP per month, new plan)
    );

    expect(result.remainingValueCents).toBe(0);
    expect(result.amountDueCents).toBe(300);
    expect(result.bonusDays).toBe(0);
  });

  it('should calculate prorated credit when upgrading midway through a month', () => {
    const result = calculateProratedUpgrade(
      15, // daysRemaining (half a month)
      5000, // currentPriceInCents (50 EGP per month)
      30, // currentCycleDays (monthly)
      10000 // targetPriceInCents (100 EGP per month)
    );

    // 5000 * (15/30) = 2500 credit
    expect(result.remainingValueCents).toBe(2500);
    // 10000 - 2500 = 7500 due
    expect(result.amountDueCents).toBe(7500);
    expect(result.bonusDays).toBe(0);
  });

  it('should round remaining credit UP to favor the user', () => {
    const result = calculateProratedUpgrade(
      10, // daysRemaining
      1000, // currentPriceInCents (10 EGP per month)
      31, // currentCycleDays
      2000 // targetPriceInCents
    );

    // 1000 * (10 / 31) = 322.58...
    // Math.ceil(322.58...) = 323
    expect(result.remainingValueCents).toBe(323);
    // 2000 - 323 = 1677
    expect(result.amountDueCents).toBe(1677);
  });

  it('should calculate bonus days if current remaining value exceeds new plan price', () => {
    // Edge case: User is on a $100 annual plan, has 11 months left (~$91 value).
    // They "upgrade" to a $10 monthly plan (different cycle).
    const result = calculateProratedUpgrade(
      330, // daysRemaining (~11 months)
      10000, // currentPriceInCents (100 EGP per year)
      365, // currentCycleDays (annual)
      1000, // targetPriceInCents (10 EGP per month)
    );

    // 10000 * (330/365) = 9041 credit
    expect(result.remainingValueCents).toBe(9042); // ceil
    
    // Amount due should be 0 since 9042 > 1000
    expect(result.amountDueCents).toBe(0);

    // Bonus days calculation:
    // Leftover credit = 9042 - 1000 = 8042
    // Daily rate of target = 1000 / 30 = 33.333
    // Bonus days = 8042 / 33.333 = 241.26 -> floor = 241
    expect(result.bonusDays).toBe(241);
  });
});
