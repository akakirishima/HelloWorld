# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: Vite + React + TypeScript UI. Pages live in `frontend/src/pages/`, shared layout in `frontend/src/components/layout/`, and reusable UI pieces in `frontend/src/components/ui/`.
- `backend/`: FastAPI app. API routes live in `backend/app/api/routes/`, domain logic in `backend/app/services/`, persistence in `backend/app/store/`, and data models in `backend/app/models/`.
- Tests live in `backend/tests/`. Deployment notes and Raspberry Pi guidance live in `docs/` and `infra/`.

## Build, Test, and Development Commands
- Frontend dev server: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Frontend lint: `cd frontend && npm run lint`
- Frontend E2E: `cd frontend && npm run test:e2e`
- Backend dev server: `cd backend && uvicorn app.main:app --reload`
- Backend install for development: `cd backend && pip install -e .[dev]`
- Backend tests: `cd backend && pytest`
- Backend lint: `cd backend && ruff check .`

## Coding Style & Naming Conventions
- Use 2-space indentation in TypeScript/TSX and 4-space indentation in Python.
- Keep TypeScript components and pages in `PascalCase` files when practical, and use `camelCase` for functions, variables, and hooks.
- Use `snake_case` for Python modules, functions, and test files.
- Prefer small, explicit functions and short module boundaries. Run `eslint` and `ruff` before submitting changes.

## Testing Guidelines
- Backend tests use `pytest`; place new tests in `backend/tests/` with filenames like `test_<feature>.py`.
- Prefer unit tests for stores/services and API tests for route behavior.
- Add coverage for migrations, delete flows, and storage/back-up behavior when touching persistence code.
- For frontend changes, run `npm run build` and add Playwright coverage when the UI flow changes materially.

## Commit & Pull Request Guidelines
- Commit history is short and practical, with messages such as `feat: ...`, `remove ...`, and `clarify ...`. Keep commits focused and imperative.
- PRs should include a short summary, affected areas, and verification steps. Add screenshots or screen recordings for UI changes.
- Link related issues when available, and call out any deployment or data-migration impact explicitly.

## Security & Configuration Tips
- Do not commit `.env` files, local SQLite files, or NAS paths.
- Raspberry Pi deployments should treat SQLite as local state and NAS as backup/output storage only.
