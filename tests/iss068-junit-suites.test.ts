// ISS-068: verify counted 5 of zhaoxi's 193 tests because parseJunit took the first
// tests="n" attribute in the document — one describe() suite — as the run total.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseJunit } from "../tools/gate/evidence.ts";

const nodeTestShape = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
\t<testcase name="tests\\bundle\\adapter.test.ts" time="0.71" classname="test" failure="test failed">
\t\t<failure type="testCodeFailure" message="test failed">[Error: test failed]</failure>
\t</testcase>
\t<testsuite name="backup / restore / verify" time="0.5" disabled="0" errors="0" tests="5" failures="0" skipped="0" hostname="x">
\t\t<testcase name="a" time="0.1" classname="test"/>
\t\t<testcase name="b" time="0.1" classname="test"/>
\t\t<testcase name="c" time="0.1" classname="test"/>
\t\t<testcase name="d" time="0.1" classname="test"/>
\t\t<testcase name="e" time="0.1" classname="test"/>
\t</testsuite>
\t<testsuite name="restore robustness" time="0.3" disabled="0" errors="0" tests="3" failures="0" skipped="1" hostname="x">
\t\t<testsuite name="nested describe" time="0.1" disabled="0" errors="0" tests="2" failures="0" skipped="0" hostname="x">
\t\t\t<testcase name="f" time="0.1" classname="test"/>
\t\t\t<testcase name="g" time="0.1" classname="test"/>
\t\t</testsuite>
\t\t<testcase name="h" time="0.1" classname="test">
\t\t\t<skipped/>
\t\t</testcase>
\t</testsuite>
</testsuites>
`;

test("ISS-068 parseJunit counts every suite of a node:test report, including nested describe blocks and file-level failures", () => {
  // 1 failed file entry + 5 + 2 + 1 skipped = 9 cases; 7 passed
  assert.deepEqual(parseJunit(nodeTestShape), { passed: 7, failed: 1, skipped: 1 });
});

test("ISS-068 parseJunit still reads pytest's single suite and vitest's root totals", () => {
  const pytest = `<?xml version="1.0" encoding="utf-8"?><testsuites><testsuite name="pytest" errors="1" failures="0" skipped="2" tests="6" time="1.0">
<testcase classname="t" name="a" time="0.1"/>
<testcase classname="t" name="b" time="0.1"><skipped type="pytest.skip" message="no"/></testcase>
<testcase classname="t" name="c" time="0.1"><skipped type="pytest.skip" message="no"/></testcase>
<testcase classname="t" name="d" time="0.1"><error message="boom">trace</error></testcase>
<testcase classname="t" name="e" time="0.1"/>
<testcase classname="t" name="f" time="0.1"/>
</testsuite></testsuites>`;
  assert.deepEqual(parseJunit(pytest), { passed: 3, failed: 1, skipped: 2 });
  const vitest = `<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="12" failures="1" errors="0" time="2.0">
    <testsuite name="a.test.ts" timestamp="2026-09-01T00:00:00.000Z" hostname="x" tests="7" failures="1" errors="0" skipped="0" time="1.0">
    </testsuite>
    <testsuite name="b.test.ts" timestamp="2026-09-01T00:00:00.000Z" hostname="x" tests="5" failures="0" errors="0" skipped="0" time="1.0">
    </testsuite>
</testsuites>`;
  assert.deepEqual(parseJunit(vitest), { passed: 11, failed: 1, skipped: 0 });
});
