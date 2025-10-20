import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("infra/.env")
db_url = os.environ.get("DB_URL")
assert db_url, "Missing DB_URL"

schema_path = os.path.join("etl", "sql", "schema.sql")
with open(schema_path, "r", encoding="utf-8") as f:
    sql = f.read()

engine = create_engine(db_url)
with engine.begin() as conn:
    conn.execute(text(sql))
print("Database schema created successfully.")