from sqlalchemy import Engine, inspect, text


USER_COLUMN_MIGRATIONS = {
    "contact_type": "VARCHAR(16)",
    "contact_value": "VARCHAR(254)",
    "contact_verified_at": "{timestamp}",
    "approval_status": "VARCHAR(16) NOT NULL DEFAULT 'approved'",
    "signup_requested_at": "{timestamp}",
    "privacy_agreed_at": "{timestamp}",
    "privacy_version": "VARCHAR(32)",
    "approved_at": "{timestamp}",
}


def apply_schema_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("portal_users"):
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("portal_users")
    }
    timestamp_type = (
        "TIMESTAMP WITH TIME ZONE"
        if engine.dialect.name == "postgresql"
        else "TIMESTAMP"
    )
    with engine.begin() as connection:
        for column_name, column_type in USER_COLUMN_MIGRATIONS.items():
            if column_name in existing_columns:
                continue
            resolved_type = column_type.format(timestamp=timestamp_type)
            connection.execute(
                text(
                    f"ALTER TABLE portal_users "
                    f"ADD COLUMN {column_name} {resolved_type}"
                )
            )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "ix_portal_users_contact_value "
                "ON portal_users (contact_value)"
            )
        )
