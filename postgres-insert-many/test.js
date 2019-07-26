const { Client } = require('pg')
const uuid = require('uuid')
const { Benchmark } = require('../tools/benchmark')

const client = new Client()
const ENV_ID = process.env.ENV_ID || "test"

main()

async function main() {
  await client.connect()
  await init()
  await test_batch_insert()
  await client.end()
}

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS test (id varchar)`)
}

async function test_batch_insert() {
  const batchStr = (n) => [...Array(n).keys()].map(i => `($${i+1})`).join(', ')

  const b = new Benchmark(`batch insert`)
  const N = [1, 10, 100, 200, 500, 1000, 2000, 3000, 4000, 5000, 10000, 15000]
  for (let n of N) {
    b.add(`batch ${n}`, {
      before: () => [...Array(n).keys()].map(i => uuid.v4()),
      fn: (params) => q(`INSERT INTO test (id) VALUES ${batchStr(n)}`, params),
      tagsFn: async () => ({...env, ...await tableSize('test') }),
      options: { transactionsPerTest: n }
    })
  }
  await b.execute()
}


const q = (query, params) => client.query(query, params)
const tableSize = (name) => q(`SELECT count(*) from ${name}`).then(v => ({n: v.rows[0].count}))
const env = { env: ENV_ID }