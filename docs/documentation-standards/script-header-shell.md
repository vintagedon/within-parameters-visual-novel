# Shell Script Header Template

> Template Version: 2.0
> Applies To: All `.sh` files
> Last Updated: 2026-03-29

---

## Template

```bash
#!/usr/bin/env bash
# =============================================================================
# Script Name  : script-name.sh
# Description  : [One-line description of what the script does]
# Repository   : within-parameters-visual-novel
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : YYYY-MM-DD
# Link         : https://github.com/vintagedon/within-parameters-visual-novel
# =============================================================================
#
# DESCRIPTION
#   [2-4 sentences explaining the script's purpose, what it operates on,
#   and what outputs it produces. Include any important behavioral notes.]
#
# USAGE
#   ./script-name.sh [options]
#
# EXAMPLES
#   ./script-name.sh
#       [Description of what this invocation does]
#
#   ./script-name.sh --verbose
#       [Description of what this invocation does]
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# [Configuration variables with inline comments]

# =============================================================================
# Main
# =============================================================================

main() {
    # [Main script logic]
}

main "$@"
```

---

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| Script Name | Yes | Filename for reference |
| Description | Yes | Single line, verb-led description |
| Repository | Yes | Repository name |
| Author | Yes | Name with GitHub profile link |
| Created | Yes | Creation date (YYYY-MM-DD) |
| Link | Yes | Full repository URL |

---

## Notes

- Always use `#!/usr/bin/env bash` for portability
- `set -euo pipefail` catches common errors early
- Use `main()` function pattern even for simple scripts
- See [code-commenting-dual-audience.md](code-commenting-dual-audience.md) for comment conventions
