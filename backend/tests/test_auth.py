def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_login_success_student(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "aiman.student@demo.umappoint.edu", "password": "Password123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "student"
    assert data["email"] == "aiman.student@demo.umappoint.edu"


def test_login_success_lecturer(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "nurul.hakim@demo.umappoint.edu", "password": "Password123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "lecturer"
    assert data["email"] == "nurul.hakim@demo.umappoint.edu"


def test_login_invalid_password(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "nurul.hakim@demo.umappoint.edu", "password": "WrongPassword999!"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_login_nonexistent_user(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "nonexistent.user@demo.umappoint.edu", "password": "Password123!"},
    )
    assert res.status_code == 401


def test_get_profile_student(client, auth_headers_student):
    res = client.get("/api/auth/me", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert "matric_no" in data
    assert "programme" in data
    assert "year_of_study" in data
    assert "specialization" not in data


def test_get_profile_lecturer(client, auth_headers_lecturer):
    res = client.get("/api/auth/me", headers=auth_headers_lecturer)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "lecturer"
    assert "title" in data
    assert "department" in data
    assert "office_location" in data
    assert "specialization" in data
    assert "consultation_info" in data
    assert "matric_no" not in data


def test_patch_profile_lecturer(client, auth_headers_lecturer):
    # Update phone
    res = client.patch(
        "/api/auth/me",
        headers=auth_headers_lecturer,
        json={"phone": "+60 12 345 6789"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["phone"] == "+60 12 345 6789"
