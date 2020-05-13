const { Client } = require('@elastic/elasticsearch')

const client = new Client({ node: 'http://localhost:9200' })

const sample_data = [
  'email1@example.com',
  'email2@example.com',
  'email3@example.com',
  'email4@example.com',
  'email5@example.com',
  'email6@example.pl',
  'abc@def.ghi'
]

describe('search', () => {

  beforeAll(async () => {
    await prepare_test_data()
  })

  async function prepare_test_data() {
    await client.indices.delete({ index: ['test_idx' ], ignore_unavailable: true })
    await client.indices.create({
      index: 'test_idx',
      body: {
        analysis: {
          analyzer: {
            default: {
              type: "whitespace",
            }
          }
        },
        mappings: {
          properties: {
            email: { type: 'text' }
          }
        }
      }
    }, { ignore: [400] })
    const body = sample_data.reduce((acc, email) => [...acc, ...[{index: {_index: 'test_idx'}}, {email}]], [])
    await client.bulk({
      refresh: true,
      body
    })
  }

  test('query.term finds nothing when searching for whole value', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          term: {
            email: { value: 'email1@example.com' }
          }
        }
      }
    })

    expect(body.hits.hits).toEqual([])
  })

  test('query.term finds something when searching for single term', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          term: {
            email: { value: 'email1' }
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([
      {email: 'email1@example.com'}
    ])
  })

  test('query.match matches by any word in query (eg just by domain)', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          match: {
            email: 'email1@example.com'
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([
      {email: 'email1@example.com'},
      {email: 'email2@example.com'},
      {email: 'email3@example.com'},
      {email: 'email4@example.com'},
      {email: 'email5@example.com'}
    ])
  })

  test('query.match word part finds nothing', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          match: {
            email: 'ema'
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([])
  })

  test('query.match whole word finds nothing', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          match: {
            email: 'example'
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([])
  })

  test('query.regexp word part', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          regexp: {
            email: {
              value: '.*mail5.*'
            }
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([
      { email: 'email5@example.com' }
    ])
  })

  test('query.wildcard word part', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          wildcard: {
            email: {
              value: '*mail5*'
            }
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([
      { email: 'email5@example.com' }
    ])
  })

  test('query.prefix doesnt work with @', async () => {
    const { body } = await client.search({
      index: 'test_idx',
      body: {
        query: {
          prefix: {
            email: {
              value: 'email5@e'
            }
          }
        }
      }
    })

    expect(body.hits.hits.map(e => e._source)).toEqual([
      { email: 'email5@example.com' }
    ])
  })

  test('standard analyzer tokenizes email into 2 words', async () => {
    const { body } = await client.indices.analyze({
      index: 'test_idx',
      body: {
        analyzer: 'standard',
        text: 'email5@example.com'
      }
    })

    expect(body.tokens.map(t => t.token)).toEqual(['email5', 'example.com'])
  })

  test('whitespace analyzer tokenizes email into 1 word', async () => {
    const { body } = await client.indices.analyze({
      index: 'test_idx',
      body: {
        analyzer: 'whitespace',
        text: 'email5@example.com'
      }
    })

    expect(body.tokens.map(t => t.token)).toEqual(['email5@example.com'])
  })
})
