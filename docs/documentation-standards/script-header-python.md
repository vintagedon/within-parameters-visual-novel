# Python Script Header Template

> Template Version: 2.0
> Applies To: All `.py` files
> Last Updated: 2026-03-29

---

## Template

```python
#!/usr/bin/env python3
"""
Script Name  : script_name.py
Description  : [One-line description of what the script does]
Repository   : within-parameters-visual-novel
Author       : VintageDon (https://github.com/vintagedon/)
Created      : YYYY-MM-DD
Link         : https://github.com/vintagedon/within-parameters-visual-novel

Description
-----------
[2-4 sentences explaining the script's purpose, what it operates on,
and what outputs it produces. Include any important behavioral notes.]

Usage
-----
    python script_name.py [options]

Examples
--------
    python script_name.py
        [Description of what this invocation does]

    python script_name.py --verbose
        [Description of what this invocation does]
"""

# =============================================================================
# Imports
# =============================================================================

from pathlib import Path

# =============================================================================
# Configuration
# =============================================================================

# [Configuration constants with inline comments]

# =============================================================================
# Functions
# =============================================================================


def main() -> None:
    """Entry point for script execution."""
    pass


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    main()
```

---

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| Script Name | Yes | Filename for reference (snake_case) |
| Description | Yes | Single line, verb-led description |
| Repository | Yes | Repository name |
| Author | Yes | Name with GitHub profile link |
| Created | Yes | Creation date (YYYY-MM-DD) |
| Link | Yes | Full repository URL |
| Description section | Yes | Expanded multi-line explanation |
| Usage section | Yes | Command syntax |
| Examples section | Yes | At least one usage example |

---

## Notes

- Use `#!/usr/bin/env python3` for portability
- Module docstring goes immediately after shebang
- Keep Description line under 80 characters
- Use present tense, active voice
- See [code-commenting-dual-audience.md](code-commenting-dual-audience.md) for comment conventions
