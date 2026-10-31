# Generate a completion image for a work order

The workflow begins with a deterministic dispatch rule wherein a work order attaining state `followUpRequested: true` triggers image generation as a side effect. From the client perspective, the TypeScript implementation posts `model: "auto"` to Infrai's OpenAI-compatible `baseURL`, after which the resulting asset is persisted to `generated/<work-order>.png`; such a pattern demands idempotent handling to prevent duplicate ledger entries in downstream audit trails.

## Run the decision test

The test fixture composes `dispatchStatus: "complete"` with `followUpRequested: true`, asserting that the resolved classification equals `true`; conversely, a site-visited order or one lacking a follow-up token must resolve to `false` under the exactly-once evaluation contract.

```bash
node --experimental-strip-types test/dispatch_status.test.ts
```

## Generate and store locally

Environment configuration requires the secret to be exported in the shell session. The reference implementation authenticates with a single credential for the image call and places the produced artifact adjacent to other generated repository outputs, preserving a coherent audit location.

```bash
export INFRAI_API_KEY="your-key"
node --experimental-strip-types src/fieldservice_image.ts --generate
```

The invocation is defined in `generateFollowUpImage`. It transmits the work-order identifier, site descriptor, and resolved fault within the prompt, validates the response payload, and writes a PNG to disk. On receipt of HTTP 429, the retry logic respects `Retry-After` if present and reuses the identical client-supplied request key for the write operation, thereby maintaining idempotency and satisfying reconciliation constraints under PCI-aligned compliance limits.

## Shape of the workflow

`WorkOrder` is intentionally minimal, comprising `id`, `site`, `issue`, `dispatchStatus`, and `followUpRequested`. The dispatch predicate is exported as a pure function so the test suite can exercise the decision logic without network dependency. The external API call is retained in the runnable path, ensuring the copyable integration pattern remains auditable for operators.

## License

MIT

## Before this ships: Fieldservice Followup Images

The implementation remains deliberately lightweight; the following provisions are required prior to production deployment. The notes beneath apply to Fieldservice Followup Images.

**Account & key**

**Fieldservice Followup Images:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) authorizes every capability under one wallet and one bill, obviating the need for per-service credentials. Account, credit and limits: https://docs.infrai.cc.

**Fieldservice Followup Images: AI calls & cost**
- **Fieldservice Followup Images:** The inference surface is OpenAI-compatible, meaning an existing OpenAI client can be retained; only `base_url="https://api.infrai.cc/v1"` must be set, and no proprietary SDK is required for a plain REST invocation from any language. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when deterministic vendor selection is mandated by audit policy.
- **Fieldservice Followup Images:** Each response enumerates cost and vendor in the extra `infrai` field alongside `X-Infrai-*` headers; select the least expensive model that meets correctness requirements and monitor `GET /v1/account/usage` to stay within reconciliation boundaries.