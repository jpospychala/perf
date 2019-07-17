const { Client } = require('pg')
const uuid = require('uuid')
const { ulid } = require('ulid')
const client = new Client()

main()

async function main() {
  await client.connect()
  await prepare()
  await batch_insert()
  await test_insert_4()
  await client.end()
}

async function prepare() {
  await q(`CREATE TABLE IF NOT EXISTS uuid1 (id uuid    primary key);`)
  await q(`CREATE TABLE IF NOT EXISTS varc1 (id varchar primary key);`)
  await q(`CREATE TABLE IF NOT EXISTS ulid1 (id varchar primary key);`)
  await q(`CREATE TABLE IF NOT EXISTS bigi1 (id bigint  primary key);`)
}

/* batch 2000, select random, insert random, insert sequential bigint */
async function batch_insert() {
  const minSamples = 500;
  let i = (await q('SELECT max(id) min FROM bigi1')).rows[0].min || 0
  const batch = 2000;
  const batchStr = [...Array(batch).keys()].map(i => `($${i+1})`).join(', ');
  const uuid1Size = () => q('SELECT count(*) from uuid1').then(v => v.rows[0].count)
  const varc1Size = () => q('SELECT count(*) from varc1').then(v => v.rows[0].count)
  const ulid1Size = () => q('SELECT count(*) from ulid1').then(v => v.rows[0].count)
  const bigi1Size = () => q('SELECT count(*) from bigi1').then(v => v.rows[0].count)
  const qrys = [
    // insert
    { msg: {name:`batch${batch}`, serie: `insert uuid to uuid`}, sizeFn: uuid1Size, multiplier: batch,
      query: `INSERT INTO uuid1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => uuid.v4()) },
    { msg: {name:`batch${batch}`, serie: `insert uuid to varchar`}, sizeFn: varc1Size, multiplier: batch,
      query: `INSERT INTO varc1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => uuid.v4()) },
    { msg: {name:`batch${batch}`, serie: `insert ulid to varchar`}, sizeFn: ulid1Size, multiplier: batch,
      query: `INSERT INTO ulid1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => ulid()) },
    { msg: {name:`batch${batch}`, serie: `insert number to bigint`}, sizeFn: bigi1Size, multiplier: batch,
      query: `INSERT INTO bigi1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(_ => ++i) },
 ]
  
  for (query of qrys) {
    await repeat(query.msg, query.multiplier, query.sizeFn, minSamples, () => q(query.query, query.params()))
  }
}


async function test_insert_4() {
  const minSamples = 10000;
  let i = (await q('SELECT max(id) min FROM bigi1')).rows[0].min || 0
  const batch = 1;
  const batchStr = [...Array(batch).keys()].map(i => `($${i+1})`).join(', ');
  const uuid1Size = () => q('SELECT count(*) from uuid1').then(v => v.rows[0].count)
  const varc1Size = () => q('SELECT count(*) from varc1').then(v => v.rows[0].count)
  const ulid1Size = () => q('SELECT count(*) from ulid1').then(v => v.rows[0].count)
  const bigi1Size = () => q('SELECT count(*) from bigi1').then(v => v.rows[0].count)
  const qrys = [
    // insert
    { msg: {name:`insert`, serie: `uuid to uuid`}, sizeFn: uuid1Size, multiplier: batch,
      query: `INSERT INTO uuid1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => uuid.v4()) },
    { msg: {name:`insert`, serie: `uuid to varchar`}, sizeFn: varc1Size, multiplier: batch,
      query: `INSERT INTO varc1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => uuid.v4()) },
    { msg: {name:`insert`, serie: `ulid to varchar`}, sizeFn: uuid1Size, multiplier: batch,
      query: `INSERT INTO ulid1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(i => ulid()) },
    { msg: {name:`insert`, serie: `number to bigint`}, sizeFn: bigi1Size, multiplier: batch,
      query: `INSERT INTO bigi1 (id) VALUES ${batchStr}`, params: () => [...Array(batch).keys()].map(_ => ++i) },
    // ----- select
    { msg: {name:`select`, serie: `uuid from uuid`}, sizeFn: uuid1Size, multiplier: 1,
      query: 'SELECT FROM uuid1 where id = $1', params: () => [uuid.v4()] },
    { msg: {name:`select`, serie: `uuid from varchar`}, sizeFn: varc1Size, multiplier: 1,
      query: 'SELECT FROM varc1 where id = $1', params: () => [uuid.v4()] },
    { msg: {name:`select`, serie: `ulid from varchar`}, sizeFn: ulid1Size, multiplier: 1,
      query: 'SELECT FROM ulid1 where id = $1', params: () => [ulid()] },
    { msg: {name:`select`, serie: `number from bigint`}, sizeFn: bigi1Size, multiplier: 1,
      query: 'SELECT FROM bigi1 where id = $1', params: () => [Math.floor(Math.random()*i)] },
    { msg: {name:`select`, serie: `number from bigint 1%`}, sizeFn: bigi1Size, multiplier: 1,
      query: 'SELECT FROM bigi1 where id = $1', params: () => [Math.max(0, Math.floor(i - Math.random()*1000))] },
 ]
  
  for (query of qrys) {
    await repeat(query.msg, query.multiplier, query.sizeFn, minSamples, () => q(query.query, query.params()))
  }
}

async function repeat(msg, multiplier, sizeFn, count, fn) {
  const runs = []
  for (let run of [...Array(count).keys()]) {
    const runNow = new Date().getTime()
    await fn()
    const runAfter = new Date().getTime()
    runs.push(runAfter-runNow)
  }
  const n = await sizeFn()
  const total = runs.reduce((sum, i) => sum+i, 0)
  runs.sort((a,b) => a - b)
  const min = runs[0]
  const max = runs[runs.length - 1]
  const p95 = runs[Math.floor(runs.length * 0.95)]
  console.log(JSON.stringify({
    env: "x220-sdb1",
    ...msg,
    n,
    tps: multiplier*count*1000/total,
    min,
    max,
    p95
  }))
}

function q(query, params) {
  return client.query(query, params)
}

function qd(query, deferred) {
  return client.query(query).then(() => deferred.resolve())
}

async function log(query) {
  console.log(`${query}`)
  const res = await q(query)
  console.log(`${query}: ${JSON.stringify(res.rows[0])}`)
}
