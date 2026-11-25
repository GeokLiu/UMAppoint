import uuid


def test_get_student_appointments(client, auth_headers_student):
    res = client.get("/api/appointments", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Verify student structure
    first = data[0]
    assert "id" in first
    assert "status" in first
    assert "purpose" in first
    assert "appointment_date" in first


def test_get_lecturer_appointments(client, auth_headers_lecturer):
    res = client.get("/api/lecturer/appointments", headers=auth_headers_lecturer)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_lecturer_status_filter(client, auth_headers_lecturer):
    res = client.get("/api/lecturer/appointments?status=approved", headers=auth_headers_lecturer)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    for appt in data:
        assert appt["status"] == "approved"


def test_student_cannot_access_lecturer_appointments(client, auth_headers_student):
    res = client.get("/api/lecturer/appointments", headers=auth_headers_student)
    assert res.status_code == 403


def test_lecturer_cannot_access_student_appointments(client, auth_headers_lecturer):
    res = client.get("/api/appointments", headers=auth_headers_lecturer)
    assert res.status_code == 403


def test_unauthenticated_appointments_access(client):
    res = client.get("/api/appointments")
    assert res.status_code == 401


def test_update_status_invalid_appointment_id(client, auth_headers_lecturer):
    fake_id = str(uuid.uuid4())
    res = client.patch(
        f"/api/appointments/{fake_id}/status",
        headers=auth_headers_lecturer,
        json={"status": "APPROVED"},
    )
    assert res.status_code == 404
