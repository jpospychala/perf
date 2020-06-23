const amqlib = require('amqplib')
const test = require('perf-lane')

var q = 'tasks'

const n = 10000

test.options.transactionsPerTest = n

test.beforeEach((p) => {
  let persistent = /persistent/.test(p.test)
  return publishMessages({ n, persistent })
})

test(`1`, (p) =>
  consumeMessages({ prefetch: 1, n })
)

test(`10`, (p) =>
  consumeMessages({ prefetch: 10, n })
)

test(`100`, (p) =>
  consumeMessages({ prefetch: 100, n })
)

test(`unlimited`, (p) =>
  consumeMessages({ prefetch: undefined, n })
)

test(`unlimited noAck`, (p) =>
  consumeMessages({ prefetch: undefined, n, noAck: true })
)

test(`1 persistent msgs`, (p) =>
  consumeMessages({ prefetch: 1, n })
)

test(`unlimited persistent msgs`, (p) =>
  consumeMessages({ prefetch: undefined, n })
)

function publishMessages({n, persistent}) {
  return new Promise(async (resolve, reject) => {
    const conn = await amqlib.connect('amqp://localhost')
    const ch = await conn.createChannel()
    await ch.assertQueue(q)
    let sent = 0
    const sendUntilFull = () => {
      while (sent < n) {
        const keepSending = ch.publish('', q, Buffer.from('something to do'), {persistent})
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

function consumeMessages({prefetch, n, noAck}) {
  return new Promise(async (resolve, reject) => {
    const conn = await amqlib.connect('amqp://localhost')
    const ch = await conn.createChannel()
    await ch.assertQueue(q)
    ch.prefetch(prefetch)
    let count = 0
    ch.consume(q, function(msg) {
      if (msg !== null) {
        count++
        noAck || ch.ack(msg);
        if (count === n) {
          conn.close().then(resolve)
        }
      }
    }, { noAck })
  })
}
