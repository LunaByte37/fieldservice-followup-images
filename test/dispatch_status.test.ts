import { strict as assert } from "node:assert";
import { shouldGenerateFollowUp, type WorkOrder } from "../src/fieldservice_image.ts";

const complete: WorkOrder = { id: "WO-test", site: "Roof unit", issue: "replace filter", dispatchStatus: "complete", followUpRequested: true };
assert.equal(shouldGenerateFollowUp(complete), true);
assert.equal(shouldGenerateFollowUp({ ...complete, dispatchStatus: "on_site" }), false);
assert.equal(shouldGenerateFollowUp({ ...complete, followUpRequested: false }), false);
console.log("dispatch decision tests passed");
