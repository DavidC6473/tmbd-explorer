import os
import pytest
from fastapi.testclient import TestClient

from dotenv import load_dotenv
load_dotenv("infra/.env")

from api.main import app

@pytest.fixture(scope="session")
def client():
    return TestClient(app)