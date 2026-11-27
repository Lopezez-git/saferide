const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/routeNews.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, context);
const match = context.exports.newsOnRoute;
const departure = Date.parse("2026-11-27T13:00:00Z");
const time = min => new Date(departure + min * 60000).toISOString();
const leg = (name, duration) => ({duration, streetSteps:[{name, duration}]});
const route = [leg("Rua Augusta", 600), leg("Avenida Paulista", 300)];
const notice = {id:"1",title:"Av. Paulista interditada hoje das 10h10 às 10h20, em São Paulo",
  category:"Trânsito e acesso",publishedAt:time(-60),window:{start:time(10),end:time(20)}};

test("passage on the second leg overlaps the announced window", () => {
  assert.equal(match([notice],route,departure)[0]?.id, "1");
  assert.equal(match([notice],route,departure+20*60000).length, 0);
  assert.equal(match([notice],[leg("Rua Augusta",600)],departure).length, 0);
  assert.equal(match([{...notice, window:{start:time(0),end:time(10)}}],route,departure).length, 0);
});
test("ambiguous, undated and superseded articles stay out of the ride", () => {
  for (const change of [{title:"Rua Augusta Maia interditada hoje"}, {title:"Av. Paulista, sentido centro, interditada hoje"}, {window:undefined}])
    assert.equal(match([{...notice,...change}],route,departure).length,0);
  const reopening = {...notice,id:"2",title:"Av. Paulista liberada em São Paulo",publishedAt:time(-1),window:undefined};
  assert.equal(match([notice,reopening],route,departure).length,0);
});
