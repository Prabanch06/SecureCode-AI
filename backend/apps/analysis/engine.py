import os
import tempfile
import subprocess
import json
import ast
import re

class StaticAnalysisEngine:
    def __init__(self, code: str, language: str = 'Python', file_name: str = 'main.py'):
        self.code = code
        self.language = language
        self.file_name = file_name
        self.temp_file_path = None
        
        # Ensure virtualenv bin directory is in PATH for subprocesses
        import sys
        venv_bin = os.path.dirname(sys.executable)
        if venv_bin not in os.environ.get('PATH', ''):
            os.environ['PATH'] = venv_bin + os.pathsep + os.environ.get('PATH', '')

    def create_temp_file(self):
        suffix = '.py'
        if self.language.lower() in ['javascript', 'js']:
            suffix = '.js'
        elif self.language.lower() in ['typescript', 'ts']:
            suffix = '.ts'
        elif self.language.lower() in ['java']:
            suffix = '.java'
        elif self.language.lower() in ['c#', 'csharp']:
            suffix = '.cs'
            
        temp = tempfile.NamedTemporaryFile(mode='w', suffix=suffix, delete=False)
        temp.write(self.code)
        temp.close()
        self.temp_file_path = temp.name
        return temp.name

    def cleanup(self):
        if self.temp_file_path and os.path.exists(self.temp_file_path):
            os.remove(self.temp_file_path)

    def run_all(self):
        """Runs pylint, flake8, radon, bandit, mypy if python; or falls back to custom logic."""
        issues = []
        metrics = {
            'maintainability_index': 85.0,
            'cyclomatic_complexity': 2,
            'technical_debt_ratio': 5.0,
            'code_duplication': 0.0,
            'architecture_debt': ''
        }

        self.create_temp_file()
        try:
            # If language is python, attempt to run standard tools
            if self.language.lower() == 'python':
                # Radon (complexity & maintainability index)
                radon_issues, radon_metrics = self._run_radon()
                issues.extend(radon_issues)
                metrics.update(radon_metrics)
                
                # Bandit (security)
                issues.extend(self._run_bandit())
                
                # Flake8 (style)
                issues.extend(self._run_flake8())
                
                # Pylint (linting/quality)
                issues.extend(self._run_pylint())
                
                # Mypy (typing check)
                issues.extend(self._run_mypy())
            else:
                # Custom multi-language AST/pattern checks for JS, TS, Java, Go, Rust, C#, PHP
                issues.extend(self._run_generic_checks())
                
        except Exception as e:
            print(f"Error executing static analysis tools: {e}")
            
        # If no issues found or execution failed, fallback to python AST analysis to populate issues
        if not issues:
            issues = self._fallback_ast_analysis()
            
        self.cleanup()
        return issues, metrics

    def _run_radon(self):
        issues = []
        metrics = {'cyclomatic_complexity': 1, 'maintainability_index': 100.0}
        
        # Check maintainability index
        try:
            res = subprocess.run(['radon', 'mi', '-j', self.temp_file_path], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                mi_score = data.get(self.temp_file_path, {}).get('mi', 100.0)
                metrics['maintainability_index'] = round(mi_score, 1)
                if mi_score < 50:
                    issues.append({
                        'severity': 'High',
                        'category': 'Maintainability',
                        'line': 'General',
                        'file': self.file_name,
                        'message': f"Critically low maintainability index: {round(mi_score, 1)}/100.",
                        'suggested_fix': 'Refactor complex code blocks and split large methods.'
                    })
                elif mi_score < 75:
                    issues.append({
                        'severity': 'Medium',
                        'category': 'Maintainability',
                        'line': 'General',
                        'file': self.file_name,
                        'message': f"Medium maintainability index score: {round(mi_score, 1)}/100.",
                        'suggested_fix': 'Clean up code smells and improve documentation.'
                    })
        except Exception:
            pass

        # Check cyclomatic complexity
        try:
            res = subprocess.run(['radon', 'cc', '-j', self.temp_file_path], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout:
                data = json.loads(res.stdout)
                blocks = data.get(self.temp_file_path, [])
                total_complexity = sum(b.get('complexity', 1) for b in blocks)
                metrics['cyclomatic_complexity'] = max(1, total_complexity)
                for b in blocks:
                    comp = b.get('complexity', 1)
                    if comp > 10:
                        issues.append({
                            'severity': 'High',
                            'category': 'Complexity',
                            'line': b.get('lineno', 1),
                            'file': self.file_name,
                            'message': f"Block '{b.get('name', 'block')}' has cyclomatic complexity of {comp}.",
                            'suggested_fix': 'Reduce nested conditions and simplify logic flow.'
                        })
        except Exception:
            pass
            
        return issues, metrics

    def _run_bandit(self):
        issues = []
        try:
            res = subprocess.run(['bandit', '-f', 'json', self.temp_file_path], capture_output=True, text=True)
            if res.stdout:
                data = json.loads(res.stdout)
                results = data.get('results', [])
                for r in results:
                    issues.append({
                        'severity': r.get('issue_severity', 'Low'),
                        'category': 'Security',
                        'line': r.get('line_number', 'General'),
                        'file': self.file_name,
                        'message': f"Bandit warning: {r.get('issue_text')}",
                        'suggested_fix': 'Review code and apply secure patterns.'
                    })
        except Exception:
            pass
        return issues

    def _run_flake8(self):
        issues = []
        try:
            res = subprocess.run(['flake8', '--format=default', self.temp_file_path], capture_output=True, text=True)
            if res.stdout:
                lines = res.stdout.strip().split('\n')
                for line in lines:
                    match = re.match(r'.*?:(\d+):\d+:\s+(\w+)\s+(.*)', line)
                    if match:
                        line_no, code, msg = match.groups()
                        issues.append({
                            'severity': 'Low' if code.startswith('E') or code.startswith('W') else 'Medium',
                            'category': 'Style',
                            'line': int(line_no),
                            'file': self.file_name,
                            'message': f"Flake8 Style violation ({code}): {msg}",
                            'suggested_fix': 'Follow PEP 8 rules to resolve warning.'
                        })
        except Exception:
            pass
        return issues

    def _run_pylint(self):
        issues = []
        try:
            res = subprocess.run(['pylint', '--output-format=json', self.temp_file_path], capture_output=True, text=True)
            if res.stdout:
                data = json.loads(res.stdout)
                for item in data:
                    issues.append({
                        'severity': 'High' if item.get('type') in ['error', 'fatal'] else 'Medium',
                        'category': 'Code Smell',
                        'line': item.get('line', 'General'),
                        'file': self.file_name,
                        'message': f"Pylint code smell ({item.get('symbol')}): {item.get('message')}",
                        'suggested_fix': 'Refactor code structure to follow standard practices.'
                    })
        except Exception:
            pass
        return issues

    def _run_mypy(self):
        issues = []
        try:
            res = subprocess.run(['mypy', '--ignore-missing-imports', self.temp_file_path], capture_output=True, text=True)
            if res.stdout:
                lines = res.stdout.strip().split('\n')
                for line in lines:
                    if 'error:' in line:
                        match = re.match(r'.*?:(\d+):\s+error:\s+(.*)', line)
                        if match:
                            line_no, msg = match.groups()
                            issues.append({
                                'severity': 'Medium',
                                'category': 'Type Check',
                                'line': int(line_no),
                                'file': self.file_name,
                                'message': f"Mypy typing error: {msg}",
                                'suggested_fix': 'Specify correct type annotations.'
                            })
        except Exception:
            pass
        return issues

    def _run_generic_checks(self):
        # Scan for common patterns in other languages (JavaScript, TS, Java, PHP, C#)
        issues = []
        lines = self.code.split('\n')
        
        # Simple security checks
        for idx, line in enumerate(lines):
            line_no = idx + 1
            # Check for secrets
            if any(key in line.lower() for key in ['api_key', 'apikey', 'secret', 'password', 'token']) and '=' in line and any(quote in line for quote in ["'", '"']):
                if not any(safe in line.lower() for safe in ['process.env', 'env', 'config']):
                    issues.append({
                        'severity': 'High',
                        'category': 'Security',
                        'line': line_no,
                        'file': self.file_name,
                        'message': 'Potential hardcoded API key or credential detected.',
                        'suggested_fix': 'Extract secrets into environment variables.'
                    })
            
            # XSS in JS/TS
            if 'innerHTML' in line and not 'sanitize' in line.lower():
                issues.append({
                    'severity': 'High',
                    'category': 'Security',
                    'line': line_no,
                    'file': self.file_name,
                    'message': 'Unsafe innerHTML assignment can lead to Cross-Site Scripting (XSS).',
                    'suggested_fix': 'Use document.createTextNode or apply a sanitisation library.'
                })
                
            # SQL Injection patterns
            if 'SELECT' in line.upper() and ('+' in line or '${' in line) and any(term in line.lower() for term in ['query', 'sql', 'db']):
                issues.append({
                    'severity': 'High',
                    'category': 'Security',
                    'line': line_no,
                    'file': self.file_name,
                    'message': 'Potential SQL injection risk from raw query string concatenation.',
                    'suggested_fix': 'Use parameterized statements or bind variables.'
                })
        return issues

    def _fallback_ast_analysis(self):
        """Standard AST fallback parser that runs when CLI commands are missing."""
        issues = []
        try:
            tree = ast.parse(self.code)
            
            class ASTVisitor(ast.NodeVisitor):
                def __init__(self):
                    self.complexity = 0
                    
                def visit_FunctionDef(self, node):
                    # Check naming conventions
                    if not re.match(r'^[a-z_][a-z0-9_]*$', node.name):
                        issues.append({
                            'severity': 'Low',
                            'category': 'Style',
                            'line': node.lineno,
                            'file': 'main.py',
                            'message': f"Function name '{node.name}' should follow snake_case naming style.",
                            'suggested_fix': f"Rename function to '{re.sub(r'(?<!^)(?=[A-Z])', '_', node.name).lower()}'."
                        })
                    
                    # Check docstring
                    if ast.get_docstring(node) is None:
                        issues.append({
                            'severity': 'Low',
                            'category': 'Style',
                            'line': node.lineno,
                            'file': 'main.py',
                            'message': f"Function '{node.name}' is missing a docstring documentation.",
                            'suggested_fix': 'Add a clear PEP 257 docstring explaining function behavior.'
                        })
                    self.generic_visit(node)
                    
                def visit_Call(self, node):
                    # Check for print statements in production
                    if isinstance(node.func, ast.Name) and node.func.id == 'print':
                        issues.append({
                            'severity': 'Low',
                            'category': 'Style',
                            'line': node.lineno,
                            'file': 'main.py',
                            'message': "Avoid using raw 'print()' statements in production code.",
                            'suggested_fix': "Use standard python 'logging' module instead."
                        })
                    
                    # Check for eval()
                    if isinstance(node.func, ast.Name) and node.func.id == 'eval':
                        issues.append({
                            'severity': 'High',
                            'category': 'Security',
                            'line': node.lineno,
                            'file': 'main.py',
                            'message': "Unsafe use of 'eval()' function can run arbitrary code inputs.",
                            'suggested_fix': "Use ast.literal_eval() or parse inputs explicitly."
                        })
                    self.generic_visit(node)
                    
                def visit_ExceptHandler(self, node):
                    # Check for bare except clause
                    if node.type is None:
                        issues.append({
                            'severity': 'Medium',
                            'category': 'Code Smell',
                            'line': node.lineno,
                            'file': 'main.py',
                            'message': "Avoid using bare 'except:' clause as it hides system exits and signals.",
                            'suggested_fix': "Catch specific exceptions e.g. 'except Exception:' or 'except ValueError:'."
                        })
                    self.generic_visit(node)

            visitor = ASTVisitor()
            visitor.visit(tree)
        except SyntaxError as e:
            issues.append({
                'severity': 'High',
                'category': 'Syntax Error',
                'line': e.lineno or 'General',
                'file': 'main.py',
                'message': f"Syntax Error: {e.msg}",
                'suggested_fix': 'Fix structural indentation or bracket completion errors.'
            })
        except Exception:
            # Fallback patterns if code isn't valid Python
            issues.extend(self._run_generic_checks())
            
        return issues
