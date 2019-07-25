const fs = require('fs')

module.exports.Benchmark = function Benchmark(name, options) {
  const defaults = {
    minRuns: 1000,
    minRunTimeSecs: 60,
    transactionsPerTest: 1,
    outFile: `results/${Date.now()}.ndjson`,
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
    let total = 0
    let idx = 0
    while (total < options.minRunTimeSecs*1000 && idx < options.minRuns) {
      const beforeResult = before && await before()
      const runNow = Date.now()
      await fn(beforeResult, {run: 0, idx: idx++})
      const runAfter = Date.now()
      runs.push(runAfter-runNow)
      total = total + runAfter-runNow
    }
    runs.sort((a,b) => a - b)
    const min = runs[0]
    const max = runs[runs.length - 1]
    const p95 = runs[Math.floor(runs.length * 0.95)]
    fs.appendFileSync(options.outFile, JSON.stringify({
      ...msg,
      ...tags,
      tps: Math.round(options.transactionsPerTest*runs.length*1000/total),
      min,
      max,
      p95
    }))+'\n'
  }
}
