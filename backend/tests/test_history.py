def test_history_student(client, auth_headers_student):
    res = client.get("/api/history", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    # Historical statuses should only be completed, rejected, or cancelled
    for item in data:
        assert item["status"] in ("completed", "rejected", "cancelled")


def test_history_lecturer(client, auth_headers_lecturer):
    res = client.get("/api/history", headers=auth_headers_lecturer)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    for item in data:
        assert item["status"] in ("completed", "rejected", "cancelled")


def test_history_unauthenticated(client):
    res = client.get("/api/history")
    assert res.status_code == 401
