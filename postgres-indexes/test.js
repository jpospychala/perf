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
  await batch_insert_test()
  await insert_select_test()
  await client.end()
}

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS uuid1 (id uuid    primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS varc1 (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS ulid1 (id varchar primary key)`)
  await q(`CREATE TABLE IF NOT EXISTS bigi1 (id bigint  primary key)`)
}

async function batch_insert_test() {
  let i = (await q('SELECT max(id) min FROM bigi1')).rows[0].min || 0
  const batch = 2000;
  const batchStr = [...Array(batch).keys()].map(i => `($${i+1})`).join(', ')
  
  const options = {
    count: 500,
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

async function insert_select_test() {
  let i = (await q('SELECT max(id) min FROM bigi1')).rows[0].min || 0

  await new Benchmark('insert')
    .add(`uuid to uuid`, {
      fn: () => q(`INSERT INTO uuid1 (id) VALUES ($1)`, [uuid.v4()]),
      tags: {...env, ...await tableSize('uuid1') },
    })
    .add(`uuid to varchar`, {
      fn: () => q(`INSERT INTO varc1 (id) VALUES ($1)`, [uuid.v4()]),
      tags: {...env, ...await tableSize('varc1') },
    })
    .add(`ulid to varchar`, {
      fn: () => q(`INSERT INTO ulid1 (id) VALUES ($1)`, [ulid()]),
      tags: {...env, ...await tableSize('uuid1') },
    })
    .add(`number to bigint`, {
      fn: () => q(`INSERT INTO bigi1 (id) VALUES ($1)`, [++i]),
      tags: {...env, ...await tableSize('bigi1') },
    })
    .execute()

  await new Benchmark('select')
    .add(`uuid from uuid`, {
      fn: () => q('SELECT FROM uuid1 where id = $1', [uuid.v4()]),
      tags: {...env, ...await tableSize('uuid1') },
    })
    .add(`uuid from varchar`, {
      fn: () => q('SELECT FROM varc1 where id = $1', [uuid.v4()]),
      tags: {...env, ...await tableSize('varc1') },
    })
    .add(`ulid from varchar`, {
      fn: () => q('SELECT FROM ulid1 where id = $1', [ulid()]),
      tags: {...env, ...await tableSize('ulid1') },
    })
    .add(`number from bigint`, {
      fn: () => q('SELECT FROM bigi1 where id = $1', [Math.floor(Math.random()*i)]),
      tags: {...env, ...await tableSize('bigi1') },
    })
    .add(`number from bigint 1%`, {
      fn: () => q('SELECT FROM bigi1 where id = $1', [Math.max(0, Math.floor(i - Math.random()*1000))]),
      tags: {...env, ...await tableSize('bigi1') },
    })
    .execute()
}

const q = (query, params) => client.query(query, params)
const tableSize = (name) => q(`SELECT count(*) from ${name}`).then(v => ({n: v.rows[0].count}))
const env = { env: ENV_ID }