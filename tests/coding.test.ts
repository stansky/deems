import assert from "node:assert/strict";
import test from "node:test";
import { codingRequestSchema } from "../src/contracts/coding";
import { codingSuite } from "../src/domains/coding/suites";
import { compareResults, executionSource } from "../src/domains/coding/harness";
import { runnableQuestionIds } from "../src/data/coding-problems";

test("coding requests bound code and reject client-provided test results or runtimes", () => {
  const input = {attemptId:"4bd119bc-c984-4fbe-aa89-075c931e45c9",questionId:"two-sum",language:"python",mode:"submit",code:"def twoSum(nums, target): return []"};
  assert(codingRequestSchema.safeParse(input).success);
  for (const extra of [{code:"x".repeat(32001)},{language:"bash"},{status:"passed"},{expected:[]},{runnerUrl:"http://localhost"}]) assert(!codingRequestSchema.safeParse({...input,...extra}).success);
});
test("all runnable questions have fixed suites and a smaller example set", () => {
  for (const id of runnableQuestionIds) {
    const full=codingSuite(id,"submit")!; const example=codingSuite(id,"examples")!;
    assert(full); assert(full.cases.length>example.cases.length);
    assert.equal(full.version,example.version);
    assert.equal(full.problem.totalCases,full.cases.length);
  }
  assert.equal(codingSuite("not-a-problem","submit"),null);
});
test("comparisons accept either two-sum index order but reject incorrect values and types", () => {
  const suite=codingSuite("two-sum","examples")!;
  const payload={results:suite.cases.map(t=>({id:t.id,actual:[...t.expected as number[]].reverse(),error:null}))};
  assert(compareResults("two-sum",suite.cases,JSON.stringify(payload)).every(row=>row.status==="passed"));
  payload.results[0].actual=[0,0];
  assert.equal(compareResults("two-sum",suite.cases,JSON.stringify(payload))[0].status,"wrong_answer");
  const bool=codingSuite("contains-duplicate","examples")!;
  assert.equal(compareResults(bool.id,bool.cases,JSON.stringify({results:bool.cases.map(t=>({id:t.id,actual:1,error:null}))}))[0].status,"wrong_answer");
});
test("missing, duplicate, malformed, or mixed runner results cannot be reported as passed", () => {
  const suite=codingSuite("two-sum","examples")!;
  for (const results of [[],[{id:"case-1",actual:[1,2],error:null}],[{id:"case-1",actual:[1,2],error:null},{id:"case-1",actual:[0,1],error:null}]]) assert.throws(()=>compareResults(suite.id,suite.cases,JSON.stringify({results})));
  assert.throws(()=>compareResults(suite.id,suite.cases,"logged text\n{}"));
  assert.throws(()=>executionSource("python","pass","invalid();"));
});
