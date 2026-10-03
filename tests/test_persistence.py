import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import server


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        server.ROOT = Path(self.temp.name)
        server.BASE = server.ROOT / "growth-workspace"
        server.DB = server.BASE / "workbench.json"
        script = Path(__file__).resolve().parents[1] / "skills/yundian-growth-workbench/scripts/init_workspace.py"
        spec = importlib.util.spec_from_file_location("initializer", script)
        self.initializer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.initializer)
        self.initializer.initialize(server.ROOT)

    def tearDown(self):
        self.temp.cleanup()

    def save(self, action, payload):
        return server.save({"revision": server.load()["revision"], "action": action, "payload": payload})

    def test_initialization_preserves_customer_files(self):
        profile = server.BASE / "knowledge/profile.md"
        profile.write_text("customer facts", encoding="utf-8")
        self.initializer.initialize(server.ROOT)
        self.assertEqual(profile.read_text(encoding="utf-8"), "customer facts")
        self.assertEqual(len(server.load()["workspace"]["stages"]), 7)

    def test_task_artifact_acceptance_and_feedback(self):
        self.save("profile", {"company": "Test company", "goal": "Research demand"})
        state = self.save("task", {"name": "Research", "stage": "market-research"})
        ident = state["tasks"][0]["id"]
        state = self.save("artifact", {"id": ident, "content": "Actual output"})
        self.assertEqual(state["tasks"][0]["status"], "needs-review")
        state = self.save("review", {"id": ident, "review": "Verified sources"})
        self.assertEqual(state["tasks"][0]["status"], "completed")
        (server.BASE / "artifacts" / (ident + ".md")).write_text("New output", encoding="utf-8")
        self.assertEqual(server.load()["tasks"][0]["status"], "needs-review")
        self.save("feedback", {"leadId": "lead-1", "result": "Qualified", "cycleId": "cycle-1"})
        self.assertEqual(server.load()["feedback"][0]["leadId"], "lead-1")

    def test_rejects_stale_writes_and_completion_without_artifact(self):
        with self.assertRaises(ValueError):
            server.save({"revision": "stale", "action": "profile", "payload": {}})
        self.save("profile", {"company": "Test company", "goal": "Research"})
        task = self.save("task", {"name": "Research", "stage": "market-research"})["tasks"][0]
        with self.assertRaises(ValueError):
            self.save("review", {"id": task["id"], "review": "Not executed"})
        self.assertEqual(server.load()["tasks"][0]["status"], "ready")


if __name__ == "__main__":
    unittest.main()
