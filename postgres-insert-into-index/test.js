const { Client } = require('pg')
const uuid = require('uuid')
const { Benchmark } = require('../tools/benchmark')

const client = new Client()
const ENV_ID = process.env.ENV_ID || "test"

main()

async function main() {
  await client.connect()
  await init()
  for (let i = 0; i < 10; i++) {
    await fill()
  }
  await test_insert_to_index_vs_no_index()
  await client.end()
}

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS randomidx (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS randomnoidx (id varchar)`)
  await q(`CREATE TABLE IF NOT EXISTS sortedidx (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS sortednoidx (id varchar)`)
}

async function fill() {
  const n = 30000
  const batchStr = (n) => [...Array(n).keys()].map(i => `($${i+1})`).join(', ')
  const uuids = [...Array(n)].map(i => uuid.v4())
  const prefix = Date.now().toString()
  const sorteds = [...Array(n)].map((i, idx) => prefix.padStart(16)+idx.toString().padStart(20))
  await q(`INSERT INTO randomidx (id) VALUES ${batchStr(n)}`, uuids)
  await q(`INSERT INTO randomnoidx (id) VALUES ${batchStr(n)}`, uuids)
  await q(`INSERT INTO sortedidx (id) VALUES ${batchStr(n)}`, sorteds)
  await q(`INSERT INTO sortednoidx (id) VALUES ${batchStr(n)}`, sorteds)
}


async function test_insert_to_index_vs_no_index() {
  await new Benchmark('insert')
    .add(`random with index`, {
      fn: () => q(`INSERT INTO randomidx (id) VALUES ($1)`, [uuid.v4()]),
      tags: {...env, ...await tableSize('randomidx') },
    })
    .add(`random with no index`, {
      fn: () => q(`INSERT INTO randomnoidx (id) VALUES ($1)`, [uuid.v4()]),
      tags: {...env, ...await tableSize('randomnoidx') },
    })
    .add(`sorted with index`, {
      before: () => Date.now().toString(),
      fn: (prefix, {idx}) => q(`INSERT INTO sortedidx (id) VALUES ($1)`, [prefix.padStart(26)+idx.toString().padStart(10)]),
      tags: {...env, ...await tableSize('sortedidx') },
    })
    .add(`sorted with no index`, {
      before: () => Date.now().toString(),
      fn: (prefix, {idx}) => q(`INSERT INTO sortednoidx (id) VALUES ($1)`, [prefix.padStart(26)+idx.toString().padStart(10)]),
      tags: {...env, ...await tableSize('sortednoidx') },
    })
    .execute()
}

const q = (query, params) => client.query(query, params)
const tableSize = (name) => q(`SELECT count(*) from ${name}`).then(v => ({n: v.rows[0].count}))
const env = { env: ENV_ID }