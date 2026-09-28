from rag.retrieve import retrieve_sop

def test_hero_scenario_fire_fixture():
    # Hero demo fixture test: zone block-c-electrical-room
    result = retrieve_sop("smoke near Block C electrical room")
    assert result["status"] == "matched"
    assert result["match"]["id"] == "CAMPUS-FIRE-3.2"
    assert result["score"] >= 0.45

def test_unrelated_query_triggers_review_required():
    # Rule 2 test: system must never invent a procedure
    result = retrieve_sop("someone left their bicycle parked in the corridor")
    assert result["status"] == "review_required"
    assert result["match"] is None