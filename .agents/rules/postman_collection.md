# Postman Collection Maintenance & Zero-Input Testing Rules

## Objective
Whenever updating or maintaining `dermaine_postman_collection.json`, ensure that **any developer or QA tester can open Postman, import the collection, and click "Send" on ANY endpoint without entering any manual input, IDs, parameters, or bearer tokens**. Every single request must return `200 OK` or `201 Created` out of the box.

---

## 1. Authentication & Secret Scanner Prevention
* **Never Hardcode Plain JWT Strings (`eyJ...`)**: Postman's Secret Scanner inspects imported JSON files and will block/fail the import with a *"Secrets Detected"* warning if literal JWT tokens are found in variables or bodies.
* **Auto-Authentication via Collection Pre-Request Script**:
  Always maintain a collection-level Pre-request Script in `col.event` that checks if `{{token}}` is missing or empty. If missing, it automatically calls `POST /auth/login` using the master test credentials (`superAdmin@gmail.com` / `12345678`), captures the returned `accessToken`, and injects it into both `{{token}}` and the current request header:
  ```javascript
  const baseUrl = pm.collectionVariables.get('baseUrl') || 'http://localhost:4073/api/v1';
  if (!pm.collectionVariables.get('token') || pm.collectionVariables.get('token') === '') {
      pm.sendRequest({
          url: baseUrl + '/auth/login',
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          body: {
              mode: 'raw',
              raw: JSON.stringify({ email: 'superAdmin@gmail.com', password: '12345678' })
          }
      }, function (err, res) {
          if (!err && res.code === 200) {
              var jsonData = res.json();
              var tok = (jsonData.result && jsonData.result.accessToken) || (jsonData.data && jsonData.data.accessToken);
              if (tok) {
                  pm.collectionVariables.set('token', tok);
                  pm.collectionVariables.set('superAdminToken', tok);
                  pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + tok });
              }
          }
      });
  }
  ```
* **Variables Initialization**: Keep initial token values as `""` (empty string) in `col.variable` so Postman imports cleanly in 0 seconds.

---

## 2. Path Variables (`:id`, `:streamId`, `:dayOfWeek`)
* **Never Use Dummy/Placeholder IDs** like `65b8f2c3d1e2f3a4b5c6d7e8` or `12345`.
* Every path variable must point to an actual, live database record:
  * `:id` on `Get Assessment By ID`: `6a3512fa79dce42f4e5f4409` (Work in Canada).
  * `:id` on `Update Question`: `6a733abd8dca50520cb6628a` (Work Permit Citizenship question).
  * `:id` on `Get Program By ID` / `Update Program`: `6a5e01f4814e31c81176a123`.
  * `:id` on `Get Stream By ID` / `Update Stream`: `6a5e0bac814e31c81176a127`.
  * `:streamId` on `Evaluable Rules` & `Validate Weights`: `6a5e0bac814e31c81176a127`.
  * `:id` on `Get Rule By ID` & `Update Rule`: `6a5e0ef431dcc962d59c2703`.
  * `:dayOfWeek` on `Get Day-Wise Slots`: `0` (Sunday, where live slots exist in the database).

---

## 3. Safe Deletion Testing (DELETE Endpoints)
* Never point `DELETE` endpoints to production or core entity IDs.
* Maintain dedicated test entity IDs in collection variables (`deleteQuestionId`, `deleteProgramId`, `deleteStreamId`, `deleteRuleId`, `deleteSlotId`) so that clicking `Send` on any DELETE endpoint succeeds with `200 OK` without removing essential system data.

---

## 4. Unique Fields & Dynamic Payloads
* Any request creating an entity with a unique database constraint (`email`, `slug`, `title`) MUST use dynamic Postman variables to allow infinite re-testing without collision:
  * Emails: `user_{{$timestamp}}@example.com`
  * Slugs: `org-slug-{{$timestamp}}`
  * Titles / Names: `Assessment Title {{$timestamp}}`

---

## 5. Complex Workflows Pre-Filling
* **Submit Assessment (`POST /submit-assessment`)**: The answers object must be completely pre-populated with valid question IDs and values matching all required questions for the assessment tree (e.g. Work in Canada assessment `6a3512fa79dce42f4e5f4409`), ensuring it passes validation and runs through the matching engine successfully.
* **Consultation Booking (`POST /consultation/book`)**: Pre-filled with future date (e.g. `2026-11-20`), valid time (`10:00 AM`), duration (`THIRTY_MINUTES`), mode (`TEAMS`), and test Stripe payment method (`pm_card_visa`).

---

## 6. Verification Requirement
* Whenever you modify the Postman collection or underlying backend routes, run a fast smoke test across endpoints to verify all requests return `200 OK` or `201 Created` with zero manual intervention.
