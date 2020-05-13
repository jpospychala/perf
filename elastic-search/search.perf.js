const { Benchmark } = require('../tools/benchmark')

const ENV_ID = process.env.ENV_ID || "test"
const env = { env: ENV_ID }

main()

async function main() {
  const { Client } = require('@elastic/elasticsearch')
  const client = new Client({ node: 'http://localhost:9200' })
  await test_search(client)
  await client.close()
}

async function fill(client) {
  const rndEmail = rndEmailGen()
  const samples = []
  try {
    await client.indices.delete({ index: ['emails_txt' ]})
  } catch (ex) {}
  await client.indices.create({
    index: 'emails_txt',
    body: {
      mappings: {
        properties: {
          email: { type: 'text' }
        }
      }
    }
  }, { ignore: [400] })
  for (let i = 0; i < 2000; i++) {
    const emails = seq(500).map(() => ({email: rndEmail()}))
    samples.push(emails[0].email)
    console.log(i)
    const body = emails.reduce((acc, body) => [...acc, ...[{index: {_index: 'emails_txt'}}, body]], [])
    const { body: bulkResponse } = await client.bulk({
      refresh: true,
      body
    })
    if (bulkResponse.errors) {
      console.log('Errors', bulkResponse.errors)
    }
  }
  return samples
}

async function test_search(client) {
  const samples = await fill(client)
  const tags = {...env, n: 1}
  await new Benchmark('search', {})
    .add(`query match`, {
      fn: (_,{idx}) => client.search({
        index: 'emails_txt',
        body: {
          query: {
            match: {
              email: samples[idx]
            }
          }
        }
      }),
      tags,
    })
    .add(`query regexp prefix`, {
      fn: (_,{idx}) => client.search({
        index: 'emails_txt',
        body: {
          query: {
            regexp: {
              email: `${samples[idx]}.substring(0, 5).*`
            }
          }
        }
      }),
      tags,
    })
    .add(`query wildcard prefix`, {
      fn: (_,{idx}) => client.search({
        index: 'emails_txt',
        body: {
          query: {
            wildcard: {
              email: `${samples[idx]}.substring(0, 5)*`
            }
          }
        }
      }),
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