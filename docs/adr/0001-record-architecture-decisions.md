# 0001. Record the architecture decisions

- Status: Accepted
- Date: 2026-10-23

## Context

The challenge asks for a small system with a large surface: money rules, concurrency, duplicate delivery, retries, and observability. The code shows what was built; it does not show why. A reviewer who disagrees with a choice cannot tell whether the choice was deliberate or accidental, and a future change repeats the argument from memory.

## Decision

Every decision that shapes the structure is written once, in `docs/adr/`, before it is implemented. The record holds five parts: number and title, status and date, context, decision, and consequences. A decision that is replaced gets a new record; the old record keeps its number, and its status changes to `Superseded by NNNN`.

An ADR is not a tutorial. It states one choice, the alternative that lost, and the cost the project accepted.

## Consequences

- The reasoning survives the conversation that produced it.
- A change that contradicts an ADR is visible before the code lands, because the contradiction needs a new record.
- The repository grows a second kind of document: the `spec.md` says what a folder does, and the ADR says why the whole is shaped this way.
