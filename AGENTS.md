# AGENTS.md - Developer Guidelines for Dermaine Backend

## Postman Collection (`dermaine_postman_collection.json`) Standards

Whenever creating, editing, or updating `dermaine_postman_collection.json`, follow these mandatory rules:

1. **Zero-Input Requirement**:
   Every request must be 100% pre-configured. A developer must be able to import the collection and click "Send" on ANY request without typing anything or setting any variables manually.

2. **No Literal JWT Strings in the JSON File**:
   Do NOT hardcode raw JWT strings starting with `eyJ...` inside `variable` or request bodies. Postman's Secret Scanner will flag them on import and block/fail the import with a *"Secrets Detected"* warning.
   Instead, use a **Collection-level Pre-request Script** (`col.event`) that transparently calls `POST /auth/login` (with `superAdmin@gmail.com` / `12345678`) to fetch and set `{{token}}` if missing. Keep the initial value of `token` in `variable` as `""`.

3. **Live Database IDs for Path Variables**:
   Never use placeholder IDs like `65b8f2c3d1e2f3a4b5c6d7e8`. Always inspect the actual MongoDB Atlas database and pre-populate `:id`, `:streamId`, and `:dayOfWeek` with real, working records:
   - Work in Canada Assessment: `6a3512fa79dce42f4e5f4409`
   - PR Assessment: `6a3512fa79dce42f4e5f4407`
   - Express Entry Program: `6a5e01f4814e31c81176a123`
   - Stream ID: `6a5e0bac814e31c81176a127`
   - Rule ID: `6a5e0ef431dcc962d59c2703`
   - Organization ID: `6a425dcffd3a4d8183f9096d`
   - Active Slot Day: `0` (Sunday)

4. **Dedicated Test Entities for Destructive/DELETE Endpoints**:
   Never point `DELETE` endpoints to primary entity IDs. Maintain dedicated test entity variables (`deleteQuestionId`, `deleteProgramId`, `deleteStreamId`, `deleteRuleId`, `deleteSlotId`) so tests succeed with `200 OK` without deleting core data.

5. **Dynamic Unique Fields**:
   Always use dynamic variables like `{{$timestamp}}` for unique fields (`email`, `slug`, `title`) so requests can be run repeatedly without encountering unique constraint errors.

6. **Full Pre-population for Complex Submissions**:
   Complex payloads like `POST /submit-assessment` must contain complete, valid answer mappings for all required questions in the assessment tree, so that the request passes validation and completes the full match engine run.
