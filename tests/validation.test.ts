import { test } from "node:test";
import assert from "node:assert/strict";
import { mutationSchema, sameOrigin } from "../src/lib/validation";

test("accepts valid practice records and preserves code",()=>{
 const input={action:"session",data:{id:"session-1",exerciseId:"ex-1",mode:"Coach",notes:"Needs retry",code:"const n = 1;",elapsed:300,completedAt:"2026-10-27T15:00:00Z",selfReview:"Explain cancellation"}};
 assert.deepEqual(mutationSchema.parse(input),input);
});
test("rejects invalid stages and oversized notes",()=>{
 const meta={expectedRevision:0,producer:"test",key:"test-1"};
 const data={id:"role-1",roleId:"role-1",company:"Sycamore",title:"Engineer",stage:"Made up",nextAction:"",notes:""};
 assert.equal(mutationSchema.safeParse({action:"application",data,meta}).success,false);
 assert.equal(mutationSchema.safeParse({action:"note",meta,data:{key:"n",value:"x".repeat(100001)}}).success,false);
});
test("rejects negative timers and invalid dates",()=>{
 const data={id:"s",exerciseId:"e",mode:"Coach",notes:"",code:"",elapsed:-5,completedAt:"not-a-date",selfReview:""};
 assert.equal(mutationSchema.safeParse({action:"session",data}).success,false);
});
test("requires an explicit recall rating",()=>{
 assert.equal(mutationSchema.safeParse({action:"review",data:{cardId:"c",rating:"excellent",reviewedAt:"2026-10-27T15:00:00Z"}}).success,false);
 assert.equal(mutationSchema.safeParse({action:"review",data:{cardId:"c",rating:"again",reviewedAt:"2026-10-27T15:00:00Z"}}).success,true);
});
test("allows same host including the local interview domain",()=>{
 assert.equal(sameOrigin(new Request("http://app:3000/api/workspace",{headers:{host:"interview.local",origin:"http://interview.local"}})),true);
});
test("rejects browser writes from a different website",()=>{
 assert.equal(sameOrigin(new Request("http://interview.local/api/workspace",{headers:{host:"interview.local",origin:"https://evil.example"}})),false);
 assert.equal(sameOrigin(new Request("http://interview.local/api/workspace",{headers:{host:"interview.local",origin:"null"}})),false);
});
