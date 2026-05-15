# Re-record with: vhs docs/vhs/eval-harness.tape
# Requires data/permit-3-8/labels.json + PDFs locally (gitignored).

Output docs/vhs/eval-harness.gif

Set FontSize 16
Set Width 1200
Set Height 360
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 30ms

Type "uv run python scripts/eval_pipeline.py --profile cloud-fast --dry-run --limit 5"
Sleep 500ms
Enter
Sleep 8s
