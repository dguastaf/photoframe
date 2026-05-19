from app.ports import _parse_ports_env, load_port_defaults, ports_env_path


def test_ports_env_file_exists():
    assert ports_env_path().is_file()


def test_load_port_defaults_matches_ports_env():
    file_values = _parse_ports_env(ports_env_path().read_text(encoding="utf-8"))
    ports = load_port_defaults()
    assert ports.server_port == int(file_values["PHOTOFRAME_SERVER_PORT"])
    assert ports.client_port == int(file_values["PHOTOFRAME_CLIENT_PORT"])
    assert ports.client_host == file_values["PHOTOFRAME_CLIENT_HOST"]
    assert ports.client_origin == f"http://{ports.client_host}:{ports.client_port}"
