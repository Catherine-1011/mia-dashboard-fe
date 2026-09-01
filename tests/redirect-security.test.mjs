import test from "node:test";
import assert from "node:assert/strict";
import { getSafeInternalRedirect, getSafeTrustedRedirect } from "../lib/redirect-security.js";

const ORIGIN = "https://dashboard.madeinarnhemland.com.au";

for (const path of ["/", "/admindashboard", "/sellerdashboard", "/customerdashboard", "/shop/test", "/account?tab=orders", "/path#section"]) {
  test(`allows internal redirect ${path}`, () => {
    assert.equal(getSafeInternalRedirect(path, "/fallback", ORIGIN), path);
  });
}

for (const candidate of ["//evil.example", "///evil.example", "https://evil.example", "http://evil.example", "javascript:alert(1)", "data:text/html,test", "/\\evil.example", "\\\\evil.example", "%2F%2Fevil.example", "/%2F%2Fevil.example", "/%5Cevil.example", "/safe\npath"]) {
  test(`rejects internal redirect ${JSON.stringify(candidate)}`, () => {
    assert.equal(getSafeInternalRedirect(candidate, "/fallback", ORIGIN), "/fallback");
  });
}

test("allows an exact trusted external origin with a path", () => {
  const candidate = "https://madeinarnhemland.com.au/login?loggedOut=1";
  assert.equal(getSafeTrustedRedirect(candidate, "/login", ["https://madeinarnhemland.com.au"]), candidate);
});

test("rejects arbitrary and trusted-prefix external origins", () => {
  for (const candidate of ["https://evil.example", "https://madeinarnhemland.com.au.evil.example"]) {
    assert.equal(getSafeTrustedRedirect(candidate, "/login", ["https://madeinarnhemland.com.au"]), "/login");
  }
});
