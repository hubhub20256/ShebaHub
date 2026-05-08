# ShebaHub Postman Smoke Collection

A minimal Postman collection that exercises the main ShebaHub API flows
end-to-end. It is **not** a substitute for the pytest suite — pytest covers
correctness; this collection is for quick smoke verification that a running
backend is reachable, authenticates, and responds with the expected shapes.

## Files

| File | Purpose |
|------|---------|
| `shebahub.postman_collection.json` | The collection (folders: Auth, Reference Data, Profiles, Research, Research Tasks, Chat, Admin Smoke). |
| `shebahub.local.postman_environment.json` | Environment with `base_url`, credentials placeholders, and runtime variables. |

## Importing into Postman

1. Open Postman → **File → Import**.
2. Drop in **both** files (collection + environment).
3. In the top-right environment selector, switch to **ShebaHub Local**.
4. Open the environment (eye icon → "Edit") and update:
   - `base_url` — defaults to `http://localhost:8000`.
   - `user_email` / `user_password` — replace the placeholders with a real
     test user that exists in your dev DB. The default `test@example.com` /
     `ChangeMe123!` is just a placeholder.

## Running the smoke pass (manual)

Open **Auth → Login** first and click **Send**. The login test script
captures `access_token` and `refresh_token` into the environment, so every
subsequent authenticated request will pick them up automatically through the
collection-level Bearer auth.

After Login succeeds, you can run any other folder. The Research folder's
**Create Research** request will populate `research_id`; the Research Tasks
folder's **Create Task** request will populate `task_id`. If you skip those
two creates, the detail/update/chat requests fall back to whatever
`research_id` / `task_id` you set in the environment manually (defaults to
`1`).

## Running the whole collection (Collection Runner)

In Postman: click the collection → **Run** → keep the default order →
ensure **ShebaHub Local** is selected as the environment → **Run ShebaHub
API Smoke**. Postman will execute every request top-to-bottom and report
which assertions passed / failed.

## Running headlessly with Newman (optional)

[Newman](https://www.npmjs.com/package/newman) is the CLI runner. Install:

```bash
npm install -g newman
```

Then from the repo root:

```bash
newman run docs/postman/shebahub.postman_collection.json \
  -e docs/postman/shebahub.local.postman_environment.json \
  --reporters cli
```

Useful flags:

- `--bail` — stop on first failed assertion.
- `--reporters cli,junit --reporter-junit-export newman.xml` — emit JUnit
  XML for CI.
- `--env-var "user_email=other@example.com"` — override an env var without
  editing the file.

> **Note:** Newman is not installed by default in this dev environment.
> The collection works perfectly inside the Postman GUI without it.

## Test assertions

Every request includes Postman tests covering:

- **Status code** — accepts the realistic set, e.g. `[200, 201]` for
  creates, `[200, 404]` where the resource may not exist yet, `[200, 403]`
  for endpoints that require staff/profile context.
- **Response time** — under 2000ms.
- **JSON shape / important fields** — e.g. Login asserts `tokens.access`
  and `tokens.refresh`; reference-data lists assert the body is an array;
  paginated admin endpoints assert `results` is present.

The status-code assertions are deliberately lenient (e.g. allowing 403 or
404) so the suite stays green against a freshly-started server with no
seed data. That's the right tradeoff for smoke; for stricter verification
use the pytest suite (`python -m pytest apps/`).

## Deviations from the original endpoint spec

If you compared the requests in the collection to the spec, three
endpoint paths were corrected to match the actual Django routes:

| Spec                              | Actual route used in the collection                |
|-----------------------------------|----------------------------------------------------|
| `POST /api/research/`             | `POST /api/research/me/` (root is GET-only)        |
| `GET /api/admin/dashboard/`       | `GET /api/admin-panel/stats/`                      |
| `GET /api/admin/users/`           | `GET /api/admin-panel/users/`                      |
| `GET /api/admin/researches/`      | `GET /api/admin-panel/researches/`                 |
| `GET /api/admin/logs/`            | `GET /api/admin-panel/logs/`                       |

These reflect the routes registered in `config/urls.py` and the
`apps/admin_panel/urls.py` file. The collection sticks to working paths
so the smoke run produces meaningful 2xx/4xx results rather than 404.

## Pre-flight checklist

Before running:

1. Backend is running locally (`python manage.py runserver`) on the port
   in `base_url`.
2. The DB has at least one user matching `user_email` / `user_password`,
   or run **Auth → Signup** first (it accepts 201 *and* 400 "already
   exists", so it's safe to run repeatedly).
3. For the `Research`, `Research Tasks`, and `Chat` folders, the test
   user should have either created a research or be an approved member;
   otherwise these requests legitimately return 403 / 404 and the tests
   accept that.
4. For the `Admin Smoke` folder, the test user must be `is_staff=True`;
   otherwise the tests pass on 403 (not 200), which still counts as
   "endpoint reachable, ACL enforced."

## Security

- No real credentials, tokens, or DB exports are committed in these files.
- `access_token` and `refresh_token` start blank; they are populated only
  inside your local Postman environment after a successful Login.
- If you hit a non-local environment, set `base_url` accordingly and use
  Postman's **Vault** for any production secrets — do not paste them
  into the environment file.
