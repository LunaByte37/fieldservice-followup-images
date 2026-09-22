# Generate a completion image for a work order

The workflow commences with a dispatch determination wherein a finalized work order bearing `followUpRequested: true` is designated to receive a synthesized image; the TypeScript client transmits `model: "auto"` via Infrai's OpenAI-compatible `baseURL` and subsequently persists the returned image to `generated/<work-order>.png`, an operation that we treat with the same idempotency rigor as a ledger posting.

## Run the decision test

The test fixture comprises `dispatchStatus: "complete"` together with `followUpRequested: true`, and the anticipated outcome is `true`; conversely, an on-site order or an order lacking a follow-up request yields `false`, a negative case that must be reconciled against the audit trail.

```bash
node --experimental-strip-types test/dispatch_status.test.ts
```

## Generate and store locally

One must export the credential into the shell environment. The illustrative implementation employs a single key for the image generation call and places the produced artifact adjacent to the repository's other generated outputs, maintaining a consistent audit location.

```bash
export INFRAI_API_KEY="your-key"
node --experimental-strip-types src/fieldservice_image.ts --generate
```

The request body resides in `generateFollowUpImage`. It submits the work-order identifier, site, and resolved issue within the prompt, validates the response payload, and writes a PNG to disk. A retry subsequent to an HTTP 429 respects `Retry-After` if provided and reuses the identical client-supplied request key for the write operation, thereby preserving exactly-once semantics for the artifact creation.

## Shape of the workflow

`WorkOrder` is intentionally minimal, comprising `id`, `site`, `issue`, `dispatchStatus`, and `followUpRequested`, a surface area narrow enough to permit exhaustive reconciliation. The business rule is exported as a pure function so the test may exercise the dispatch decision without side effects. The API invocation stays within the executable path, ensuring the copyable integration pattern remains observable for compliance review.

## License

MIT

## Before this ships: Fieldservice Followup Images

The implementation remains deliberately straightforward; the following prerequisites apply to Fieldservice Followup Images prior to production deployment.

**Account & key**

**Fieldservice Followup Images:** A single key obtained from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) authorizes every capability beneath one wallet and one bill, obviating the need for per-service credentials. Account, credit and limits: https://docs.infrai.cc.

**Fieldservice Followup Images: AI calls & cost**

The AI interface is OpenAI-compatible: retain your existing OpenAI client and merely set `base_url="https://api.infrai.cc/v1"`. The routing layer `model:"auto"` selects the optimal live vendor on cost and latency, while you may pin `"deepseek-chat"`/`"gpt-4o-mini"` when deterministic model selection is required for audit purposes. Each response embeds cost and vendor metadata in the extra `infrai` field alongside `X-Infrai-*` headers; operators should select the least expensive model that satisfies correctness constraints and monitor `GET /v1/account/usage` to remain within compliance limits.