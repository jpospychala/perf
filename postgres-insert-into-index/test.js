const { Client } = require('pg')
const uuid = require('uuid')
const { ulid } = require('ulid')
const { Benchmark } = require('../tools/benchmark')

const client = new Client()
const ENV_ID = process.env.ENV_ID || "test"

main()

async function main() {
  await client.connect()
  await init()
  await test_insert_to_index_vs_no_index()
  await test_batch_insert()
  await client.end()
}

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS randomidx (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS randomnoidx (id varchar)`)
  await q(`CREATE TABLE IF NOT EXISTS sortedidx (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS sortednoidx (id varchar)`)
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
      fn: (prefix, {idx}) => q(`INSERT INTO sortedidx (id) VALUES ($1)`, [prefix+idx.toString().padStart(36)]),
      tags: {...env, ...await tableSize('sortedidx') },
    })
    .add(`sorted with no index`, {
      before: () => Date.now().toString(),
      fn: (prefix, {idx}) => q(`INSERT INTO sortednoidx (id) VALUES ($1)`, [prefix+idx.toString().padStart(36)]),
      tags: {...env, ...await tableSize('sortednoidx') },
    })
    .execute()
}

async function test_batch_insert() {
  let i = (await q('SELECT max(id) min FROM bigi1')).rows[0].min || 0
  const batch = 2000;
  const batchStr = [...Array(batch).keys()].map(i => `($${i+1})`).join(', ')
  
  const options = {
    count: 100,
    transactionsPerTest: batch,
  }

  await new Benchmark(`batch${batch}`, options)
    .add(`insert uuid to uuid`, {
      before: () => [...Array(batch).keys()].map(i => uuid.v4()),
      fn: (params) => q(`INSERT INTO uuid1 (id) VALUES ${batchStr}`, params),
      tags: {...env, ...await tableSize('uuid1') },
    })
    .add(`insert uuid to varchar`, {
      before: () => [...Array(batch).keys()].map(i => uuid.v4()),
      fn: (params) => q(`INSERT INTO varc1 (id) VALUES ${batchStr}`, params),
      tags: {...env, ...await tableSize('varc1') },
    })
    .add(`insert ulid to varchar`, {
      before: () => [...Array(batch).keys()].map(i => ulid()),
      fn: (params) => q(`INSERT INTO ulid1 (id) VALUES ${batchStr}`, params),
      tags: {...env, ...await tableSize('ulid1') },
    })
    .add(`insert number to bigint`, {
      before: () => [...Array(batch).keys()].map(_ => ++i),
      fn: (params) => q(`INSERT INTO bigi1 (id) VALUES ${batchStr}`, params),
      tags: {...env, ...await tableSize('bigi1') },
    })
    .execute()
}


const q = (query, params) => client.query(query, params)
const tableSize = (name) => q(`SELECT count(*) from ${name}`).then(v => ({n: v.rows[0].count}))
const env = { env: ENV_ID }