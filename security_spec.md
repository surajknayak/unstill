# Security Specification — UnStill

## 1. Data Invariants
1. **Strict User Ownership**: Every document in `/users/{uid}` and its subcollections (`profile`, `schedule`, `plans`, `logs`, `pain`, `meta`, `reports`) belongs strictly to the authenticated user whose `request.auth.uid == uid`.
2. **Default Deny**: All paths outside `/users/{uid}` are denied by default (`allow read, write: if false;`).
3. **Path Variable Validation**: All document IDs (`uid`, `docId`, `date`, `logId`, `painId`, `reportId`) are validated with `isValidId()` (`<= 128` chars, alphanumeric/hyphen/underscore).
4. **Bounded Payloads**: Strings and lists are bounded to prevent resource exhaustion ("Denial of Wallet").

## 2. The "Dirty Dozen" Payloads
1. Unauthenticated read/write to `/users/user1`.
2. Cross-user read (`auth.uid = 'attacker'` reading `/users/victim`).
3. Cross-user profile write (`auth.uid = 'attacker'` writing `/users/victim/profile/main`).
4. Oversized `name` string (`> 120` chars) on `/users/{uid}`.
5. Invalid ID injection (`> 128` chars or special characters) in `/users/{uid}/logs/{logId}`.
6. Out-of-range pain score (`score: 99` or `score: -5`) in `/users/{uid}/pain/{painId}`.
7. Unbounded `conditions` array (`> 30` items) in `/users/{uid}/profile/main`.
8. Unbounded `items` array (`> 50` items) in `/users/{uid}/plans/{date}`.
9. Invalid `durationSec` (`< 0` or `> 86400`) in `/users/{uid}/logs/{logId}`.
10. Invalid `streak` (`< 0`) in `/users/{uid}/meta/main`.
11. Oversized report message (`> 1000` chars) in `/users/{uid}/reports/{reportId}`.
12. Write to an undeclared root collection `/admin/config`.

## 3. Red Team Audit Summary
- **Identity Spoofing**: Blocked (`isOwner(uid)` required on all user paths).
- **Resource Poisoning**: Blocked (`isValidId` and string/array size limits enforced).
- **PII Blanket Read**: Blocked (only `isOwner(uid)` can read `/users/{uid}`).
