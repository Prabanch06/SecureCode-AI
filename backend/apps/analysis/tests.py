from django.test import TestCase
from apps.analysis.engine import StaticAnalysisEngine

class StaticAnalysisEngineTest(TestCase):
    def test_python_analysis_runs_radon_and_bandit(self):
        # A simple python code with a print statement (Style warning)
        # and a bare except (Code smell)
        code = """def my_function():
    try:
        print("Hello")
    except:
        pass
"""
        engine = StaticAnalysisEngine(code=code, language="Python", file_name="test.py")
        issues, metrics = engine.run_all()
        
        # Verify that we got some issues and metrics
        self.assertGreater(len(issues), 0)
        self.assertIn('maintainability_index', metrics)
        self.assertIn('cyclomatic_complexity', metrics)
        
        # Verify specific issues are caught (e.g. bare except or print statement)
        messages = [issue['message'] for issue in issues]
        has_except_warning = any("bare 'except'" in msg or "except:" in msg for msg in messages)
        has_print_warning = any("print()" in msg for msg in messages)
        self.assertTrue(has_except_warning or has_print_warning)
