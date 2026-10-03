import importlib.util
from pathlib import Path
import tempfile
import unittest

class AuditTests(unittest.TestCase):
    def test_coverage_initial_state_and_preservation(self):
        script=Path(__file__).resolve().parents[1]/'skills/yundian-growth-seo-geo/scripts/init_audit.py'
        spec=importlib.util.spec_from_file_location('audit',script)
        audit=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(audit)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for platform,count in [('shopify',38),('wordpress',26)]:
                path=root/(platform+'.json')
                result=audit.initialize(platform,path)
                self.assertEqual(len(result['items']),count)
                self.assertTrue(all(x['result']=='待验证' and not x['evidence'] for x in result['items']))
                before=path.read_bytes()
                with self.assertRaises(FileExistsError): audit.initialize(platform,path)
                self.assertEqual(before,path.read_bytes())
