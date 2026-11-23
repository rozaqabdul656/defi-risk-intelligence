from backend.app.config import settings

def test_high_utilization_threshold_is_explicit():
    assert settings.risk_utilization_threshold_pct == 80
    assert 80 >= settings.risk_utilization_threshold_pct
