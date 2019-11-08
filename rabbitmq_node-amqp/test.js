const amqp = require('amqp')
const { Benchmark } = require('../tools/benchmark')

const ENV_ID = process.env.ENV_ID || "test"
const env = { env: ENV_ID }

var q = 'tasks';

main()

async function main() {
  await test_prefetch()
}

async function test_prefetch() {
  const n = 10000
  await new Benchmark('prefetch', { transactionsPerTest: n })
    .add(`1`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 1, n }),
      tags: {...env, n: 1 },
    })
    .add(`10`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 10, n }),
      tags: {...env, n: 1 },
    })
    .add(`100`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: 100, n }),
      tags: {...env, n: 1 },
    })
    .add(`unlimited`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: undefined, n }),
      tags: {...env, n: 1 },
    })
    .add(`unlimited noAck`, {
      before: () => publishMessages({n}),
      fn: () => consumeMessages({ prefetch: undefined, n, noAck: true }),
      tags: {...env, n: 1 },
    })
    .add(`1 persistent msgs`, {
      before: () => publishMessages({n, persistent: true}),
      fn: () => consumeMessages({ prefetch: 1, n }),
      tags: {...env, n: 1 },
    })
    .add(`unlimited persistent msgs`, {
      before: () => publishMessages({n, persistent: true}),
      fn: () => consumeMessages({ prefetch: undefined, n }),
      tags: {...env, n: 1 },
    })
    .execute()
}

function publishMessages({n, persistent}) {
  return new Promise((resolve, reject) => {
    const conn = amqp.createConnection({ url: 'amqp://localhost' })
    conn.on('error', function(e) {
      reject(e)
    })
    conn.on('close', function() {
      resolve()
    })
    conn.on('drain', function() {
      console.log('drain')
    })
    conn.on('ready', function() {
      conn.queue(q, {durable: true, autoDelete: false}, function (queue) {
        conn.exchange('x', {type: 'direct', confirm: true}, (exchange) => {
          queue.bind(exchange, q, async () => {
            const publishP = (msg) => new Promise((resolve, reject) => {
              exchange.publish(q, msg, { deliveryMode: persistent ? 2: 1 }, (err, msg) => {
                if (err) {
                  reject(msg)
                } else {
                  resolve()
                }
              })
            })
            for (i = 0; i < n; i++) {
              await publishP('something to do')
            }
            conn.disconnect()
          })
        })
      })
    })
  })
}

function consumeMessages({prefetch, n, noAck}) {
  return new Promise((resolve, reject) => {
    const conn = amqp.createConnection({ url: 'amqp://localhost' })
    let count = 0
    conn.on('error', function(e) {
      reject(e)
    })
    conn.on('close', function() {
      resolve()
    })
    conn.on('ready', function() {
      conn.queue(q, {durable: true, autoDelete: false}, function(queue) {
        queue.subscribe({ ack:!noAck, prefetchCount: prefetch}, function (msg, headers, deliveryInfo, messageObject) {
          count++
          noAck || messageObject.acknowledge(false)
          if (count === n) {
            conn.disconnect()
            resolve()
          }
        })
      })
    })
  })
}
