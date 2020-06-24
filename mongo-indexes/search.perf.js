const test = require('perf-lane')
const MongoClient = require('mongodb').MongoClient

const URL = 'mongodb://localhost:27017/myproject'

let conn
let db
let emails
let emails2
let samples

test.before(async () => {
  conn = await MongoClient.connect(URL)
  db = conn.db('myproject')
  emails = db.collection('emails1')
  emails2 = db.collection('emails2')
  samples = await init_db(db)
})

test.after(async () => {
  await conn.close()
})

async function init_db(db) {
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

test(`exact w/o index`, (p) =>
  emails.find({email: samples[p.i % samples.length] }).toArray()
    .then(clg(1, p.i % samples.length))
)

test(`exact w index`, (p) =>
  emails2.find({email: samples[p.i % samples.length] }).toArray()
    .then(clg(2, p.i % samples.length))
)

test(`regex`, (p) =>
  emails.find({email: new RegExp(`${samples[p.i % samples.length]}`) }).toArray()
    .then(clg(3, p.i % samples.length))
)

test(`regex w index`, (p) =>
  emails2.find({email: new RegExp(`${samples[p.i % samples.length]}`) }).toArray()
    .then(clg(4, p.i % samples.length))
)

test(`regex ^$`, (p) =>
  emails.find({email: new RegExp(`^${samples[p.i % samples.length]}$`) }).toArray()
    .then(clg(5, p.i % samples.length))
)

test(`regex first 5 chars`, (p) =>
  emails.find({email: new RegExp(`^${samples[p.i % samples.length].substring(0,5)}`) }).toArray()
    .then(clg(6, p.i % samples.length))
)

test(`regex first 5 chars w index`, (p) =>
  emails.find({email: new RegExp(`^${samples[p.i % samples.length].substring(0,5)}`) }).toArray()
    .then(clg(7, p.i % samples.length))
)

test(`regex any 5 chars`, (p) =>
  emails.find({email: new RegExp(`${samples[p.i % samples.length].substring(0,5)}`) }).toArray()
    .then(clg(8, p.i % samples.length))
)

test(`text search`, (p) =>
  emails.find({$text: { $search: `${samples[p.i % samples.length]}` }}).toArray()
    .then(clg(9, p.i % samples.length))
)

test(`text search first 5 chars`, (p) =>
  emails.find({$text: { $search: `${samples[p.i % samples.length].substring(0,5)}` }}).toArray()
    .then(clg(10, p.i % samples.length))
)

test(`text search exact`, (p) =>
  emails.find({$text: { $search: `"${samples[p.i % samples.length]}"` }}).toArray()
    .then(clg(11, p.i % samples.length))
)

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

function clg(i, idx) {
  return (res) => {
    //console.log(i, idx, res.length)
  }
}
