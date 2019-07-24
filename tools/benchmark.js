
module.exports.Benchmark = function Benchmark(name, options) {
  const defaults = {
    count: 10000,
    transactionsPerTest: 1,
  }
  options = { ...defaults, ...options }
  const series = []

  this.add = function(name, serie) {
    series.push({serie: name, ...serie})
    return this
  }

  this.execute = async function() {
    for (serie of series) {
      await test(
        {name, serie: serie.serie},
        serie.before,
        serie.fn,
        serie.tags
      )
    }
  }

  async function test(msg, before, fn, tags) {
    const runs = []
    for (let run of [...Array(options.count).keys()]) {
      const beforeResult = before && await before()
      const runNow = new Date().getTime()
      await fn(beforeResult)
      const runAfter = new Date().getTime()
      runs.push(runAfter-runNow)
    }
    const total = runs.reduce((sum, i) => sum+i, 0)
    runs.sort((a,b) => a - b)
    const min = runs[0]
    const max = runs[runs.length - 1]
    const p95 = runs[Math.floor(runs.length * 0.95)]
    console.log(JSON.stringify({
      ...msg,
      ...tags,
      tps: options.transactionsPerTest*options.count*1000/total,
      min,
      max,
      p95
    }))
  }
}
