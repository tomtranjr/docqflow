import os

from dotenv import load_dotenv

load_dotenv()


def main():
    """Verify LLM env vars are set. Env-only — does not call OpenAI."""
    profile = os.getenv("LLM_DEFAULT_PROFILE", "<unset>")
    model = os.getenv("OPENAI_MODEL", "<unset>")
    key = os.getenv("OPENAI_API_KEY", "")

    print(f"profile: {profile}")
    print(f"model:   {model}")

    if not key or key == "sk-..." or not key.startswith("sk-"):
        print("status:  MISSING — OPENAI_API_KEY is not set to a real key")
        return

    print("status:  OK — OPENAI_API_KEY present")


if __name__ == "__main__":
    main()
