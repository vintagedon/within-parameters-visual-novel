# PowerShell Script Header Template

> Template Version: 2.0
> Applies To: All `.ps1` files
> Last Updated: 2026-03-29

---

## Template

```powershell
<#
.SYNOPSIS
    [One-line description of what the script does]

.DESCRIPTION
    [2-4 sentences explaining the script's purpose, what it operates on,
    and what outputs it produces. Include any important behavioral notes.]

.NOTES
    Repository  : within-parameters-visual-novel
    Author      : VintageDon (https://github.com/vintagedon/)
    Created     : YYYY-MM-DD

.EXAMPLE
    .\script-name.ps1

    [Description of what this invocation does]

.EXAMPLE
    .\script-name.ps1 -Parameter Value

    [Description of what this invocation does]

.LINK
    https://github.com/vintagedon/within-parameters-visual-novel
#>

# =============================================================================
# Configuration
# =============================================================================

# [Configuration variables with inline comments]

# =============================================================================
# Execution
# =============================================================================

# [Main script logic]
```

---

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `.SYNOPSIS` | Yes | Single line, verb-led description |
| `.DESCRIPTION` | Yes | Expanded explanation of purpose and behavior |
| `.NOTES` | Yes | Static metadata (repository, author, dates) |
| `.EXAMPLE` | Yes | At least one usage example with description |
| `.LINK` | Yes | Repository URL |

---

## Notes

- PowerShell comment-based help enables `Get-Help script-name.ps1`
- Keep `.SYNOPSIS` under 80 characters
- Use present tense, active voice
- See [code-commenting-dual-audience.md](code-commenting-dual-audience.md) for comment conventions
