# Gaps: how `gaps.md` files are written

Each approach folder (`src/app/components/contesters/<approach>/gaps.md`)
says what the **tool** lacks for this page. It is not a list of failing tests:
a failing test can be an implementation miss, and a passing one can hide a gap
paid for with code.

## Rules

Decide in this order; the first rule that fits wins.

1. **Workaround → gap.** The DIY code needs a workaround to keep other
   scenarios green, or it made other scenarios fail and was reverted.
2. **Same DIY in every approach → not a gap.** The approaches all write the
   same code for it, and no tool has it built in. Listed under "Shared".
   If one tool has it built in, it is not shared: rules 3–4 apply.
3. **Complex DIY → gap.** More than ~10 lines, or a new state holder, or
   lifetime handling (reset at logout, cancel, unsubscribe), whatever the
   line count.
4. **Simple DIY → not a gap.** A few lines, no state, no lifetime.
5. **Not met** (a scenario still fails) → a gap if meeting it needs what rules
   1 or 3 describe; otherwise an **implementation miss**, listed apart with the
   fix that seems to be needed and whether it was tried.

Assumption: the implementations went through several rounds of fixes, so what
was easy is fixed. An implementation miss is listed only with a concrete
reason to think the fix is small, and marked "not tried" until it is.

**Vanilla RxJS is the baseline.** Its tool is RxJS itself, so all its
machinery is DIY. Its `gaps.md` lists that machinery with line counts: what a
library would have to provide. The other files compare against it.

Line counts: non-blank, non-comment lines of the cited range.

## Layout of a `gaps.md`

```md
# <approach>: gaps

Status: <failing scenarios from test_report.md, with its run date>.

## Gaps
### G1 · <what the tool lacks>
Rule, DIY code and size, scenarios it costs (failing or fixed with workarounds).

## Implementation misses
## Shared (not a gap)
## Not gaps
```
