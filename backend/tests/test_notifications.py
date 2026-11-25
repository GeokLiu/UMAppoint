def test_list_notifications_student(client, auth_headers_student):
    res = client.get("/api/notifications", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "id" in first
        assert "title" in first
        assert "message" in first
        assert "is_read" in first


def test_list_notifications_lecturer(client, auth_headers_lecturer):
    res = client.get("/api/notifications", headers=auth_headers_lecturer)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_notifications_unauthenticated(client):
    res = client.get("/api/notifications")
    assert res.status_code == 401


def test_mark_all_read(client, auth_headers_lecturer):
    res = client.patch("/api/notifications/read-all", headers=auth_headers_lecturer)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Verify all notifications are now read
    list_res = client.get("/api/notifications", headers=auth_headers_lecturer)
    assert list_res.status_code == 200
    for notif in list_res.json():
        assert notif["is_read"] is True


def test_mark_single_read_invalid_id(client, auth_headers_lecturer):
    import uuid
    res = client.patch(f"/api/notifications/{uuid.uuid4()}/read", headers=auth_headers_lecturer)
    assert res.status_code == 404
