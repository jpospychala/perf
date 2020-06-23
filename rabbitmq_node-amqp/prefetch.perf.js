const amqp = require('amqp')
const test = require('perf-lane')

var q = 'tasks'

const n = 1000

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
