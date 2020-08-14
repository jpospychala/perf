const { Client } = require('pg')
const uuid = require('uuid')
const fs = require('fs')
const test = require('perf-lane')

const client = new Client()

test.before(async () => {
  await client.connect()
  await sql(`DROP TABLE IF EXISTS test`)
  await sql(`DROP TABLE IF EXISTS test1m`)
  await sql(`CREATE TABLE IF NOT EXISTS test (id varchar)`)
  await sql(`CREATE TABLE IF NOT EXISTS test1m (id varchar)`)

  for (let i = 0; i < 20; i++) {
    const batchSize = 50000
    const sampleData = [...Array(batchSize).keys()].map(i => uuid.v4())
    await sql(`INSERT INTO test1m (id) VALUES ${batchStr(batchSize)}`, sampleData)
  }
})

test.after(async () => {
  await client.end()
  fs.unlinkSync('tmp.copy')
})

test.for_n([
  [1],
  [5],
  [10],
  [50],
  [100],
  [500],
  [1000],
  [5000],
  [10000],
  [50000],
  [55000],
  [60000],
  [65000],
  [100000],
])

test.beforeEach(async () => {
  await sql(`TRUNCATE TABLE test`)
})

test(`batch insert uuids`, async (p) => {
  test.options.transactionsPerTest = p.n
  const sampleData = await p.before(() => [...Array(p.n).keys()].map(i => uuid.v4()))
  return sql(`INSERT INTO test (id) VALUES ${batchStr(p.n)}`, sampleData.slice(0, p.n))
})

test(`batch insert 'hello world'`, async (p) => {
  test.options.transactionsPerTest = p.n
  const sampleData = await p.before(() => [...Array(p.n).keys()].map(i => 'hello world'))
  return sql(`INSERT INTO test (id) VALUES ${batchStr(p.n)}`, sampleData.slice(0, p.n))
})

test(`copy uuids`, async (p) => {
  test.options.transactionsPerTest = p.n
  const sampleData = await p.before(() => [...Array(p.n).keys()].map(i => uuid.v4()).join('\n'))
  fs.writeFileSync('tmp.copy', sampleData)
  return sql(`COPY test (id) FROM '/test/tmp.copy'`)
})

test(`batch insert uuid 1m`, async(p) => {
  test.options.transactionsPerTest = p.n
  const sampleData = await p.before(() =>
    [...Array(p.n).keys()].map(i => uuid.v4())
  )
  return sql(`INSERT INTO test1m (id) VALUES ${batchStr(p.n)}`, sampleData.slice(0, p.n))
})

const batchStr = (n) => [...Array(n).keys()].map(i => `($${i+1})`).join(', ')

const sql = (query, params) => client.query(query, params)
