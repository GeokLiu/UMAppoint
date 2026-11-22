def test_list_lecturers(client, auth_headers_student):
    res = client.get("/api/lecturers", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    first = data[0]
    assert "id" in first
    assert "full_name" in first
    assert "department" in first
    assert "title" in first
    assert "open_slots" in first


def test_search_lecturers_by_name(client, auth_headers_student):
    res = client.get("/api/lecturers?search=Nurul", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert any("Nurul" in l["full_name"] for l in data)


def test_filter_lecturers_by_department(client, auth_headers_student):
    res = client.get("/api/lecturers?department=Department of Artificial Intelligence", headers=auth_headers_student)
    assert res.status_code == 200
    data = res.json()
    for l in data:
        assert "Artificial Intelligence" in l["department"]


def test_get_lecturer_slots(client, auth_headers_student):
    # Get first lecturer ID
    all_lec = client.get("/api/lecturers", headers=auth_headers_student).json()
    assert len(all_lec) > 0
    lec_id = all_lec[0]["id"]

    res = client.get(f"/api/lecturers/{lec_id}/slots", headers=auth_headers_student)
    assert res.status_code == 200
    slots = res.json()
    assert isinstance(slots, list)
    if len(slots) > 0:
        first_slot = slots[0]
        assert "id" in first_slot
        assert "slot_date" in first_slot
        assert "start_time" in first_slot
        assert "end_time" in first_slot


def test_lecturers_unauthenticated(client):
    res = client.get("/api/lecturers")
    assert res.status_code == 401
