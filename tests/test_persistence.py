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

    def test_function_install_binding_and_agent_result(self):
        state = self.save("install-skills", {})
        self.assertTrue(all(s["status"] == "installed" for s in state["skills"].values()))
        self.assertTrue((server.ROOT / ".codebuddy/skills/registry.json").is_file())
        self.save("profile", {"company": "Test company", "goal": "Research"})
        task = self.save("task", {"name": "Research", "stage": "market-research"})["tasks"][0]
        self.assertEqual(task["skillId"], "yundian-growth-market-research")
        script = Path(__file__).resolve().parents[1] / "skills/yundian-growth-workbench/scripts/submit_result.py"
        spec = importlib.util.spec_from_file_location("submit", script)
        submit = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(submit)
        output = server.ROOT / "actual-result.md"
        output.write_text("Actual tool result with sources", encoding="utf-8")
        submit.submit(server.ROOT, task["id"], output)
        self.assertEqual(server.load()["tasks"][0]["status"], "needs-review")
        submit.submit(server.ROOT, task["id"], status="blocked", reason="Connector unavailable")
        self.assertEqual(server.load()["tasks"][0]["status"], "blocked")
        existing = server.ROOT / ".codebuddy/skills/yundian-growth-market-research/SKILL.md"
        existing.write_text("customer customization", encoding="utf-8")
        with self.assertRaises(ValueError):
            self.save("install-skills", {})
        self.assertEqual(existing.read_text(encoding="utf-8"), "customer customization")

    def test_stage_records_and_audit_evidence_gate(self):
        self.save("record", {"stage": "product-opportunity", "name": "Candidate", "source": "customer product file", "hypothesis": "Needs validation"})
        self.assertEqual(server.load()["records"][0]["hypothesis"], "Needs validation")
        state = self.save("audit-create", {"platform": "shopify"})
        audit = state["audits"][0]
        self.assertEqual(len(audit["items"]), 38)
        with self.assertRaises(ValueError):
            self.save("audit-item", {"auditId": audit["id"], "itemId": "T01", "result": "通过"})
        state = self.save("audit-item", {"auditId": audit["id"], "itemId": "T01", "result": "通过", "evidence": "Actual theme readback", "owner": "Customer"})
        self.assertEqual(state["audits"][0]["items"][0]["result"], "通过")
        self.assertEqual(state["audits"][0]["technicalConclusion"], "待客户验收")

    def test_initialization_preserves_customer_files(self):
        profile = server.BASE / "knowledge/profile.md"
        profile.write_text("customer facts", encoding="utf-8")
        self.initializer.initialize(server.ROOT)
        self.assertEqual(profile.read_text(encoding="utf-8"), "customer facts")
        self.assertEqual(len(server.load()["workspace"]["stages"]), 9)
        config = json.loads((server.BASE / "knowledge/sources-config.json").read_text(encoding="utf-8"))
        self.assertEqual(config["storageMode"], "local-first")
        self.assertEqual(config["externalSources"], [])
        self.assertTrue((server.BASE / "knowledge/brand-profile.md").is_file())
        self.assertTrue((server.BASE / "knowledge/buyer-personas.md").is_file())

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



