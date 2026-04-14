# Backend

FastAPI backend for the laboratory presence and journal app.

Current implementation uses:

- SQLite for attendance, session, status change, and audit data
- JSON / Markdown files for users, rooms, presence, and notes
- Session-based auth endpoints under `/api/auth`
- Backup commands for both SQLite and PostgreSQL deployments

Use the repository root `README.md` for setup and deployment instructions.
