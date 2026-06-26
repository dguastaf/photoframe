from app.ports import (
    CLIENT_DEV_HOST,
    CLIENT_DEV_ORIGIN,
    CLIENT_DEV_PORT,
    SERVER_ORIGIN,
    SERVER_PORT,
)


def test_ports_match_config_json():
    assert SERVER_PORT == 52525
    assert CLIENT_DEV_PORT == 6389
    assert CLIENT_DEV_HOST == "localhost"
    assert CLIENT_DEV_ORIGIN == "http://localhost:6389"
    assert SERVER_ORIGIN == "http://localhost:52525"
