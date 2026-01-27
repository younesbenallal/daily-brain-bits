import { describe, expect, it } from "bun:test";
import { buildUserEntitlements } from "./entitlements";
import { PLANS } from "./plans";

describe("entitlements", () => {
	it("builds entitlements for free plan", () => {
		const entitlements = buildUserEntitlements("free");
		expect(entitlements.planId).toBe("free");
		expect(entitlements.limits).toEqual(PLANS.free.limits);
		expect(entitlements.features).toEqual(PLANS.free.features);
	});

	it("builds entitlements for pro plan", () => {
		const entitlements = buildUserEntitlements("pro");
		expect(entitlements.planId).toBe("pro");
		expect(entitlements.limits).toEqual(PLANS.pro.limits);
		expect(entitlements.features).toEqual(PLANS.pro.features);
	});
});
