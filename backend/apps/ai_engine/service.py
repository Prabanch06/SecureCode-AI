import os
from django.conf import settings

# Attempt to load google-genai
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

class GeminiService:
    def __init__(self):
        self.api_key = getattr(settings, 'GEMINI_API_KEY', os.getenv('GEMINI_API_KEY', ''))
        self.client = None
        if genai and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")

    def generate_review(self, code: str, language: str = 'Python'):
        """Performs a comprehensive SOLID/clean code audit of the target source code."""
        if not self.client:
            return self._mock_review(code, language)

        prompt = f"""
You are an expert Principal Software Architect.
Please perform a detailed code review of the following {language} code.

Evaluate the code based on:
1. Code Quality & Readability
2. Architecture & Design Patterns (SOLID principles)
3. Technical Debt
4. Correctness & Security

Provide a JSON output matching exactly this schema, without any markdown or backticks formatting:
{{
  "reviewSummary": "A concise paragraph summarizing the overall code quality.",
  "suggestions": [
    {{
      "type": "SOLID" | "Readability" | "Optimization" | "Security",
      "issue": "Detailed description of what is wrong.",
      "impact": "Potential consequence of leaving this issue unfixed.",
      "solution": "Refactored recommended code or solution explanation."
    }}
  ]
}}

CODE TO REVIEW:
{code[:20000]}
"""
        try:
            response = self.client.models.generateContent(
                model='gemini-2.5-pro',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API Error in generate_review: {e}")
            return self._mock_review(code, language)

    def generate_auto_fix(self, code: str, issue_description: str, language: str = 'Python'):
        """Generates a side-by-side fix suggestion with confidence rating."""
        if not self.client:
            return self._mock_auto_fix(code, issue_description, language)

        prompt = f"""
You are an expert Software Engineer.
Please generate a secure, high-performance fix for the following issue:
Issue: {issue_description}

Original Code:
```
{code[:10000]}
```

Provide a JSON output matching exactly this schema, without any markdown or backticks formatting:
{{
  "fixedCode": "Complete code with the fix applied.",
  "explanation": "Detailed explanation of the changes.",
  "confidenceScore": number (float between 0.0 and 1.0)
}}
"""
        try:
            response = self.client.models.generateContent(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini API Error in generate_auto_fix: {e}")
            return self._mock_auto_fix(code, issue_description, language)

    def chat_explain(self, code: str, history: list, last_message: str, language: str = 'Python'):
        """Answers developer questions dynamically using conversation context."""
        if not self.client:
            return "I am running in mock mode. Please configure GEMINI_API_KEY to enable live AI responses."

        formatted_history = "\n".join([f"{h['role']}: {h['content']}" for h in history])
        prompt = f"""
You are BugHunter AI, a senior security engineer.
You are helping the developer address issues identified in the following code:
```
{code[:10000]}
```

Conversation History:
{formatted_history}

Developer: {last_message}
BugHunter AI:"""
        try:
            response = self.client.models.generateContent(
                model='gemini-2.5-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            print(f"Gemini API Error in chat_explain: {e}")
            return "Failed to fetch response from Gemini. Please verify your API key."

    def _mock_review(self, code: str, language: str):
        return {
            "reviewSummary": f"Overall clean {language} implementation. Some minor architectural and DRY improvements could be applied.",
            "suggestions": [
                {
                    "type": "SOLID",
                    "issue": "Large monolithic method found. It violates the Single Responsibility Principle.",
                    "impact": "Code is hard to unit test and maintain.",
                    "solution": "Extract sub-methods and place them inside separate handler classes."
                },
                {
                    "type": "Readability",
                    "issue": "Missing variable type declarations.",
                    "impact": "It decreases code maintainability and typing correctness.",
                    "solution": "Use type annotations where applicable."
                }
            ]
        }

    def _mock_auto_fix(self, code: str, issue_description: str, language: str):
        return {
            "fixedCode": f"# Fixed version\n{code}\n# Applied fix for: {issue_description}",
            "explanation": "Refactored variable definitions to follow best practices and secure coding patterns.",
            "confidenceScore": 0.85
        }
