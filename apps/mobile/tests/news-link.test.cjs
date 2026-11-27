const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const box = {exports: {}, URL};
const source = fs.readFileSync('src/lib/newsLink.ts', 'utf8');
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, box);
const resolve = box.exports.newsLink;
const news = {title: "Alagamento no M'Boi Morim, em São Paulo - G1", source: 'G1 · via Google Notícias', publishedAt: '2026-11-22T23:20:47Z', url: 'https://news.google.com/rss/articles/opaque?oc=5'};
test('the reported archived video opens the matching G1 report directly', () => {
  assert.equal(new URL(resolve(news).url).host, 'g1.globo.com');
  assert.ok(new URL(resolve(news).url).pathname.includes("/noticia/2026/11/22/"));
});
test('unresolved links search for the headline and never reuse the redirect', () => {
  for (const url of [news.url, 'invalid', 'javascript:void(0)']) {
    const result = resolve({...news, url, publishedAt: '2026-11-23T23:20:47Z'});
    assert.equal(result.label, 'Buscar título no G1');
    assert.equal(new URL(result.url).searchParams.get('q'), news.title.slice(0, -5));
  }
  const band = resolve({...news, title:'Chuva forte - Band', source:'Band · via Google Notícias'});
  assert.equal(new URL(band.url).searchParams.get('q'), 'Chuva forte Band');
});
test('direct publisher links remain intact', () => {
  const url = 'https://agenciabrasil.ebc.com.br/geral/noticia/artigo';
  assert.equal(resolve({...news, url}).url, url);
});
test('unarchived stories use the publisher description and keep legitimate title punctuation', () => {
  const copy=box.exports.newsCopy({...news,title:"Avenida Paulista - novas interdições - G1",description:"Haverá desvios temporários para quem segue até a Consolação."});
  assert.equal(copy.headline,"Avenida Paulista - novas interdições");
  assert.equal(copy.description,"Haverá desvios temporários para quem segue até a Consolação.");
});
