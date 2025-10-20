import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("infra/.env")
e = create_engine(os.environ["DB_URL"])

with e.begin() as c:
    movies = c.execute(text("SELECT COUNT(*) FROM movies")).scalar()
    genres = c.execute(text("SELECT COUNT(*) FROM genres")).scalar()
    links  = c.execute(text("SELECT COUNT(*) FROM movie_genres")).scalar()
print(f"movies={movies}, genres={genres}, movie_genres={links}")
