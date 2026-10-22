Generates structured pull request descriptions using a consistent format with grouped change areas and prose-only technical details.

**PS-2 rule:** No code blocks anywhere in the PR description — describe behavior in plain English sentences.

## Template

```
# [PR Title — clear summary of the feature or fix]

## 📋 Description

[2–4 sentences in English: what problem this solves, what was implemented, and notable impact for reviewers.]

## ✨ Changes

### [Area 1 — e.g. Company Management]

- ✅ [What was added]
- 🔄 [What was updated]
- 🗑️ [What was removed, if any]

### [Area 2 — e.g. Security Improvements]

- 🔒 [Security-related change]

### [Area 3 — e.g. Code Improvements]

- 🔄 [Refactors, validations, repository improvements]

## 🔧 Technical Details

### [Topic — e.g. New Endpoints]

Describe behavior in prose only (no code blocks):

- **Operation name**: route, auth requirements, response semantics.

### [Topic — e.g. Database Changes]

- [Policies, columns, migrations — plain language]

## 📦 Dependencies

- [No new dependencies / list new packages and why]
```

## Emoji reference

| Emoji | Meaning |
|-------|---------|
| ✅ | Added / enabled |
| 🔄 | Updated / changed |
| 🗑️ | Removed |
| 🔒 | Security-related |
| 📋 | Description section |
| ✨ | Changes section |
| 🔧 | Technical details section |
| 📦 | Dependencies section |

## Rules

- **PS-2:** No code blocks. Ever. Describe implementation in prose.
- Changes grouped by feature area, not by file or layer.
- Description always in English, 2–4 sentences.
- Technical Details use bold labels + sentence format: **Label**: description.

## Output

After generating the description, always write it to a file in the scratchpad directory named `pr-description.md` and show the user the file path. Do not just print the content to the chat — the deliverable is the file.

## Reference example

See `example.md` in this directory for a full real-world example.