const { Client } = require('pg')
const uuid = require('uuid')
const Benchmark = require('benchmark')
const { ulid } = require('ulid')
const client = new Client()

main()

async function main() {
  await client.connect()
  await q(`CREATE TABLE IF NOT EXISTS uuid1 (id uuid    primary key); TRUNCATE TABLE uuid1`)
  await q(`CREATE TABLE IF NOT EXISTS varc1 (id varchar primary key); TRUNCATE TABLE varc1`)
  await q(`CREATE TABLE IF NOT EXISTS ulid1 (id varchar primary key); TRUNCATE TABLE ulid1`)
  await q(`CREATE TABLE IF NOT EXISTS bigi1 (id bigint  primary key); TRUNCATE TABLE bigi1`)
  await test_insert()
  await log('SELECT COUNT(*) FROM uuid1')
  await log('SELECT COUNT(*) FROM varc1')
  await log('SELECT COUNT(*) FROM ulid1')
  await log('SELECT COUNT(*) FROM bigi1')
  await client.end()
}

async function test_insert() {
  var suite = new Benchmark.Suite('test_insert');
  const opts = {defer: true, minSamples: 10000 };

  let i = 1;
  return new Promise((resolve, reject) => {
    suite.add('insert uuid to uuid', function(deferred) {
      return qd(`INSERT INTO uuid1 VALUES ('${uuid.v4()}')`, deferred)
    }, opts)
    .add('insert uuid to varchar', function(deferred) {
      return qd(`INSERT INTO varc1 VALUES ('${uuid.v4()}')`, deferred)
    }, opts)
    .add('insert ulid to varchar', function(deferred) {
      qd(`INSERT INTO ulid1 VALUES ('${ulid()}')`, deferred)
    }, opts)
    .add('insert to bigint', function(deferred) {
      qd(`INSERT INTO bigi1 VALUES (${i++})`, deferred)
    }, opts)
    .on('cycle', function(event) {
      console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
      resolve();
    })
    .run();
  })
}

function q(query) {
  return client.query(query)
}

function qd(query, deferred) {
  return client.query(query).then(() => deferred.resolve())
}

async function log(query) {
  console.log(`${query}`)
  const res = await q(query)
  console.log(`${query}: ${JSON.stringify(res.rows[0])}`)
}
