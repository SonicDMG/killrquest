# Specs

The specifications for this project live in **[beads](https://github.com/gastownhall/beads)** — a local-first issue tracker backed by a Dolt database that travels with the repo.

Every epic, requirement, and design decision is a bead. There are no separate markdown spec files.

## Viewing the specs

```bash
# List all epics
bd list --all --json | jq -r '.[] | select(.issue_type=="epic") | .id + " — " + .title'

# View an epic and its children
bd show <epic-id>
bd list --all --parent <epic-id>
```

## Generating a design document on demand

```bash
EPIC_ID=<epic-id>

# Requirements
{
  echo "# Requirements — $(bd show $EPIC_ID --json | jq -r '.[0].title')"
  echo ""
  bd show $EPIC_ID --json | jq -r '.[0].description'
  echo ""
  bd list --all --parent $EPIC_ID --json \
    | jq -r '.[] | select(.issue_type=="feature")
      | "## \(.title)\n\n\(.description)\n\n**Acceptance criteria:**  \n\(.acceptance // "—")\n\n---\n"'
} > requirements.md

# Design decisions
{
  echo "# Design — $(bd show $EPIC_ID --json | jq -r '.[0].title')"
  echo ""
  bd list --all --parent $EPIC_ID --json \
    | jq -r '.[] | select(.issue_type=="decision")
      | "## \(.title)\n\n\(.description)\n\n**Implementation notes:**  \n\(.design // "—")\n\n---\n"'
} > design.md
```

## Current epics

| ID | Epic |
|----|------|
| killrquest-jlo | initial-app — KillrQuest bootstrap |
| killrquest-qyg | agentic-rag-chat — AI game master with tool use |
| killrquest-7kp | multi-provider-chat — Ollama/OpenAI/OpenRouter + conversation threading |
| killrquest-066 | battle-animations — combat card visual effects |
| killrquest-20f | battle-history — vectorized battle log persisted to AstraDB |
| killrquest-gjc | image-pan — draggable character image positioning persisted to AstraDB |
| killrquest-l0h | multi-combatant — party vs party combat with roster arrays |
| killrquest-8s3 | conversation-delete — delete conversations from the UI |
| killrquest-7w3 | chronicle-overlay — parchment-style post-combat narrative overlay |
| killrquest-4dm | header-tech-badges — hover tooltip badges explaining AstraDB, NVIDIA vector search, and lexical rerank |

## Installing beads

See the [beads setup section in README.md](../README.md#issue-tracking--specs-beads).
