# Enterprise Security Audit & Hardening Plan

This plan addresses several highly critical vulnerabilities found during the security audit. Implementing this plan will elevate Hekayaty to an enterprise-grade security standard.

## User Review Required

> [!CAUTION]
> **Critical Financial & Authorization Vulnerabilities Found!**
> The audit discovered multiple "P0" (Critical) vulnerabilities that allow users to alter checkout prices, redirect platform earnings to themselves, elevate their privileges to 'admin', and arbitrarily delete other creators' products. These must be patched immediately.

## Open Questions

1. Do you want to enforce Multi-Factor Authentication (MFA) for administrative actions or creator payouts at this stage?
2. Should we implement an IP ban list for accounts that attempt financial fraud (e.g., modifying checkout prices)?

## Proposed Changes

---

### API Security & IDOR Remediation (P0)

**Vulnerability**: Currently, `PATCH /api/products/:id` and `DELETE /api/products/:id` check if the user is authenticated but *fail* to verify if the user actually owns the product. This is an Insecure Direct Object Reference (IDOR). The same applies to Cart endpoints and Order endpoints.

#### [MODIFY] server/routes.ts
- Add ownership checks to product endpoints: `if (product.writerId !== req.user.id && req.user.role !== 'admin') return 403;`
- Add ownership checks to cart endpoints: `if (cartItem.userId !== req.user.id) return 403;`
- Add ownership checks to order endpoints.

---

### Privilege Escalation & Mass Assignment (P0)

**Vulnerability**: The profile update endpoint `PATCH /api/users/profile` blindly accepts `req.body` and merges it into the database. A malicious user can send `{"role": "admin", "commissionRate": 0, "walletBalance": 999999}` to instantly grant themselves administrative rights and infinite money.

#### [MODIFY] server/routes.ts
- Strip sensitive fields from profile updates by enforcing a strict Zod schema or manually plucking safe fields (e.g., `displayName`, `bio`, `avatarUrl`, `storeSettings`).
- Implement `api.users.update.input.parse(req.body)` with `.strip()` or explicit field assignment.

---

### Financial Fraud & Pricing Manipulation (P0)

**Vulnerability**: The checkout endpoint `POST /api/orders` blindly trusts `req.body.totalAmount` and `item.price` sent by the frontend. An attacker can use Chrome DevTools to change their cart total to `$0.01`. Furthermore, `item.creatorId` is trusted from the client, allowing an attacker to route the purchase earnings into their own account.

#### [MODIFY] server/routes.ts
- Refactor `POST /api/orders` to recalculate the `totalPrice` securely on the backend using the authoritative DB prices (`productMap.get(item.productId).price`).
- Hardcode the earning allocations using `product.writerId` straight from the database, ignoring the client-provided `creatorId`.
- Recalculate `totalAmount` by summing the calculated item prices + shipping, and reject the request if the client's payload does not match the server's math.

---

### Rate Limiting & Brute Force Protection (P1)

**Vulnerability**: Certain sensitive actions lack specific rate limits, exposing the system to enumeration or brute force attacks (e.g., scraping products, spamming checkout).

#### [MODIFY] server/index.ts
- Add dedicated, strict rate limiters for `/api/orders` (checkout spam), `/api/chat` (spam), and file upload routes.
- Enforce stricter API payload limits to prevent DoS attacks via massive JSON payloads.

---

### Content Security & Injection (P1)

**Vulnerability**: Need to ensure user input (like `bio`, `description`, `title`) is sanitized if it is ever rendered using `dangerouslySetInnerHTML`.

#### [MODIFY] client/src/components/ (Multiple)
- Verify `DOMPurify` is used for all rich-text rendering of user-generated content to prevent Stored XSS attacks.

## Verification Plan

### Automated/Manual Testing
1. **Privilege Test**: Attempt to send `{"role": "admin"}` to the profile update endpoint using a normal user account. Verify it is ignored.
2. **Financial Test**: Attempt to checkout with modified prices (`item.price = 0`). Verify the backend rejects the transaction or charges the correct database price.
3. **IDOR Test**: Attempt to delete a product belonging to another user. Verify a `403 Forbidden` is returned.
4. **Earnings Route Test**: Verify that purchasing an item credits the legitimate `writerId` and not a spoofed ID in the payload.
