import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("infra/.env")
db_url = os.environ.get("DB_URL")
assert db_url, "DB_URL missing in infra/.env"

engine = create_engine(db_url)

with engine.begin() as conn:
    print(conn.execute(text("select version()")).scalar())
print("DB connection OK")
