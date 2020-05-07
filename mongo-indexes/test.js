const MongoClient = require('mongodb').MongoClient
const { Benchmark } = require('../tools/benchmark')

const URL = 'mongodb://localhost:27017/myproject'
const ENV_ID = process.env.ENV_ID || "test"
const env = { env: ENV_ID }

main()

async function main() {
  const conn = (await MongoClient.connect(URL))
  const db = conn.db('myproject')
  await test_prefetch(db)
  await conn.close()
}

async function fill(db) {
  const rndEmail = rndEmailGen()
  const samples = []
  try {
    await db.collection('emails1').drop()
    await db.collection('emails2').drop()
  } catch (ex) {}
  await db.collection('emails1').createIndex({ email: "text" })
  await db.collection('emails2').createIndex({ email: 1 })
  for (let i of seq(1000)) {
    const emails = seq(1000).map(() => ({email: rndEmail()}))
    samples.push(emails[0].email)
    await db.collection('emails1').insertMany(emails)
    await db.collection('emails2').insertMany(emails)
  }
  return samples
}

function clg(i, idx) {
  return (res) => {
    //console.log(i, idx, res.length)
  }
}

async function test_prefetch(db) {
  const samples = await fill(db)
  const emails = db.collection('emails1')
  const emails2 = db.collection('emails2')
  const tags = {...env, n: 1}
  await new Benchmark('search', {})
    .add(`exact w/o index`, {
      fn: (_,{idx}) => emails.find({email: samples[idx] }).toArray().then(clg(1, idx)),
      tags,
    })
    .add(`exact w index`, {
      fn: (_,{idx}) => emails2.find({email: samples[idx] }).toArray().then(clg(2, idx)),
      tags,
    })
    .add(`regex`, {
      fn: (_,{idx}) => emails.find({email: new RegExp(`${samples[idx]}`) }).toArray().then(clg(3, idx)),
      tags,
    })
    .add(`regex w index`, {
      fn: (_,{idx}) => emails2.find({email: new RegExp(`${samples[idx]}`) }).toArray().then(clg(4, idx)),
      tags,
    })
    .add(`regex ^$`, {
      fn: (_,{idx}) => emails.find({email: new RegExp(`^${samples[idx]}$`) }).toArray().then(clg(5, idx)),
      tags,
    })
    .add(`regex first 5 chars`, {
      fn: (_,{idx}) => emails.find({email: new RegExp(`^${samples[idx].substring(0,5)}`) }).toArray().then(clg(6, idx)),
      tags,
    })
    .add(`regex first 5 chars w index`, {
      fn: (_,{idx}) => emails.find({email: new RegExp(`^${samples[idx].substring(0,5)}`) }).toArray().then(clg(7, idx)),
      tags,
    })
    .add(`regex any 5 chars`, {
      fn: (_,{idx}) => emails.find({email: new RegExp(`${samples[idx].substring(0,5)}`) }).toArray().then(clg(8, idx)),
      tags,
    })
    .add(`text search`, {
      fn: (_,{idx}) => emails.find({$text: { $search: `${samples[idx]}` }}).toArray().then(clg(9, idx)),
      tags,
    })
    .add(`text search first 5 chars`, {
      fn: (_,{idx}) => emails.find({$text: { $search: `${samples[idx].substring(0,5)}` }}).toArray().then(clg(10, idx)),
      tags,
    })
    .add(`text search exact`, {
      fn: (_,{idx}) => emails.find({$text: { $search: `"${samples[idx]}"` }}).toArray().then(clg(11, idx)),
      tags,
    })
    .execute()
}

function rndEmailGen() {
  const r100 = () => `${Math.floor(Math.random() * 100)}`
  const names = ['alice', 'bob', 'cathy', 'dave', 'eric', 'frank', 'george', 'joe', 'mike',
  'nancy', 'ole', 'pinky', 'ruby', 'silver', 'teal', 'udine', 'willy', 'xavier', 'yeti', 'zane']
  const signs = ['.', '.', '-', '_', '', '', '', '']
  const tlds = ['com', 'pl', 'de', 'net']
  const domains = [
    [30, () => 'gmail.com'],
    [20, () => 'wp.pl'],
    [20, () => 'onet.pl'],
    [10, () => 'outlook.com'],
    [20, () => r(names) + r(signs) + r(names) + r100() + '.' + r(tlds)]
  ].map(([n,fn]) => seq(n).map(fn)).reduce((acc, n) => [...acc, ...n], [])
  return () =>
  r(names) + r(signs) + r(names) + r100() + '@' + r(domains)
}

function seq(n) {
  return [...Array(n)]
}

function r(arr) {
  const n = Math.floor(Math.random()*arr.length)
  return arr[n]
}