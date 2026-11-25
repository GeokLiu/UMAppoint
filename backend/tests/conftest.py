import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers_student(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "aiman.student@demo.umappoint.edu", "password": "Password123!"},
    )
    assert res.status_code == 200, f"Student login failed: {res.text}"
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def auth_headers_lecturer(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "nurul.hakim@demo.umappoint.edu", "password": "Password123!"},
    )
    assert res.status_code == 200, f"Lecturer login failed: {res.text}"
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}
