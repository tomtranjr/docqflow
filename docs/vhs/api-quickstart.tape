# Re-record with: vhs docs/vhs/api-quickstart.tape
# Requires:
#   - the API running locally on :8080 (uv run uvicorn src.server:app --port 8080)
#   - jq on PATH (used to pretty-print the curl output; install via your package manager)

Output docs/vhs/api-quickstart.gif

Set FontSize 16
Set Width 1200
Set Height 340
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 30ms

Type "curl -s -X POST http://localhost:8080/api/predict -F 'file=@samples/sample-permit.pdf' | jq"
Sleep 500ms
Enter
Sleep 4s
