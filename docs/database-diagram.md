# Database Diagram

このアプリの主な保存先は SQLite (`backend/data/local.db`) です。
一部の Store は JSON/Markdown から SQLite へ移行・同期するための互換処理も持っていますが、現在の中心スキーマは `backend/app/db/sqlite_db.py` のテーブル定義です。

## ER Diagram

```mermaid
erDiagram
    lab ||--o{ rooms : has
    rooms ||--o{ users : assigned_to
    users ||--o{ sessions : records
    users ||--|| presence : has_latest
    sessions ||--o{ status_changes : logs
    users ||--o{ status_changes : changes_target
    users ||--o{ audit_logs : acts_as_actor
    users ||--o{ notes : writes

    lab {
        INTEGER id PK
        TEXT name
        TEXT created_at
        TEXT updated_at
    }

    rooms {
        INTEGER id PK
        INTEGER lab_id
        TEXT name
        INTEGER display_order
        INTEGER is_active
        TEXT created_at
        TEXT updated_at
    }

    users {
        TEXT user_id PK
        TEXT full_name
        TEXT display_name
        TEXT password_hash
        TEXT role
        TEXT affiliation
        TEXT academic_year
        INTEGER room_id
        INTEGER must_change_password
        TEXT last_login_at
        INTEGER is_active
        TEXT created_at
        TEXT updated_at
    }

    sessions {
        TEXT id PK
        TEXT user_id
        TEXT check_in_at
        TEXT check_out_at
        INTEGER duration_sec
        TEXT close_reason
        TEXT created_at
        TEXT updated_at
    }

    presence {
        TEXT user_id PK
        TEXT current_status
        TEXT current_session_id
        TEXT last_changed_at
        TEXT updated_at
    }

    status_changes {
        TEXT id PK
        TEXT user_id
        TEXT session_id
        TEXT from_status
        TEXT to_status
        TEXT changed_at
        TEXT changed_by
        TEXT source
    }

    audit_logs {
        TEXT id PK
        TEXT actor_user_id
        TEXT action
        TEXT target_type
        TEXT target_id
        TEXT before_json
        TEXT after_json
        TEXT reason
        TEXT created_at
    }

    notes {
        TEXT id PK
        TEXT user_id
        TEXT note_date
        TEXT title
        TEXT did_today
        TEXT future_tasks
        TEXT created_at
        TEXT updated_at
    }
```

## Main Flow

```mermaid
flowchart LR
    Login["Login / Auth"] --> Users["users"]
    Users --> Presence["presence"]
    Users --> Sessions["sessions"]
    Users --> Notes["notes"]

    CheckIn["check-in"] --> Sessions
    CheckIn --> Presence
    CheckIn --> StatusChanges["status_changes"]
    CheckIn --> AuditLogs["audit_logs"]

    StatusUpdate["status update"] --> Presence
    StatusUpdate --> StatusChanges
    StatusUpdate --> AuditLogs

    CheckOut["check-out"] --> Sessions
    CheckOut --> Presence
    CheckOut --> StatusChanges
    CheckOut --> AuditLogs

    AdminSettings["admin settings"] --> Lab["lab"]
    AdminSettings --> Rooms["rooms"]
    AdminSettings --> AuditLogs

    NotePage["daily notes"] --> Notes
    NoteExport["Excel export"] --> Notes
    NoteExport --> Sessions
```

## Notes

- `users.room_id` は `rooms.id` を参照する想定です。
- `rooms.lab_id` は `lab.id` を参照する想定です。
- `sessions.user_id`, `presence.user_id`, `notes.user_id`, `status_changes.user_id` は `users.user_id` を参照する想定です。
- `presence.current_session_id` と `status_changes.session_id` は `sessions.id` を参照する想定です。
- SQLite 定義上は `FOREIGN KEY` 制約が明示されていないため、参照整合性は主にアプリケーションコード側で管理されています。
- `notes` には `UNIQUE(user_id, note_date)` があり、1ユーザー1日につき1件の日誌になる設計です。

