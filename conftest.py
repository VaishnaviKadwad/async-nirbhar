import os
import tempfile

# Keep tests off Ollama and the real audit/evidence databases; set these before apps modules import.
os.environ["LLM_ENABLED"] = "false"
_test_data_dir = tempfile.mkdtemp(prefix="nirbhar-tests-")
os.environ["NIRBHAR_AUDIT_DB_PATH"] = os.path.join(_test_data_dir, "audit.db")
os.environ["NIRBHAR_DB_PATH"] = os.path.join(_test_data_dir, "evidence.sqlite3")
