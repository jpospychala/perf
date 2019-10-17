const amqlib = require('amqplib')
const { Benchmark } = require('../tools/benchmark')

const ENV_ID = process.env.ENV_ID || "test"
const env = { env: ENV_ID }

var q = 'tasks';

main()

async function main() {
  await test_prefetch()
}

async function test_prefetch() {
  const n = 1000
  await new Benchmark('prefetch', { transactionsPerTest: n })
    .add(`1`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 1, n }),
      tags: {...env, n: 1 },
    })
    .add(`10`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 10, n }),
      tags: {...env, n: 10 },
    })
    .add(`100`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 100, n }),
      tags: {...env, n: 100 },
    })
    .execute()
}

function publishMessages({n}) {
  return new Promise(async (resolve, reject) => {
    const conn = await amqlib.connect('amqp://localhost')
    const ch = await conn.createChannel()
    await ch.assertQueue(q)
    let sent = 0
    const sendUntilFull = () => {
      while (sent < n) {
        const keepSending = ch.publish('', q, Buffer.from('something to do'))
        sent++
        if (!keepSending) {
          return
        }
      }
      if (sent === n) {
        setTimeout(() => { conn.close().then(resolve) }, 1000)
        
      }
    }
    sendUntilFull()
    ch.on('drain', sendUntilFull)
  })
}

function consumeMessages({prefetch, n}) {
  return new Promise(async (resolve, reject) => {
    const conn = await amqlib.connect('amqp://localhost')
    const ch = await conn.createChannel()
    await ch.assertQueue(q)
    ch.prefetch(prefetch)
    let count = 0
    ch.consume(q, function(msg) {
      if (msg !== null) {
        count++
        ch.ack(msg);
        if (count === n) {
          conn.close().then(resolve)
        }
      }
    })
  })
}
