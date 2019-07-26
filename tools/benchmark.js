const fs = require('fs')
const path = require('path')

module.exports.Benchmark = function Benchmark(name, options) {
  const defaults = {
    minRuns: 100,
    minRunTimeSecs: 30,
    transactionsPerTest: 1,
    outFile: `results/runs/${Date.now()}.ndjson`,
  }
  const benchmarkOptions = { ...defaults, ...options }
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
        serie.tags,
        serie.tagsFn,
        serie.options || {}
      )
    }
  }

  async function test(msg, before, fn, tags, tagsFn, serieOptions) {
    const testOptions = {
      ...benchmarkOptions,
      ...serieOptions
    }
    console.log(`Running ${msg.name} ${msg.serie}`)
    const runs = []
    let total = 0
    let idx = 0
    while (total < testOptions.minRunTimeSecs*1000 || idx < testOptions.minRuns) {
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
    try { fs.mkdirSync(path.dirname(testOptions.outFile), { recursive: true }); } catch (ex) {}
    fs.appendFileSync(testOptions.outFile, JSON.stringify({
      ...msg,
      ...tags,
      ...tagsFn && await tagsFn(),
      tps: Math.round(testOptions.transactionsPerTest*runs.length*1000/total),
      min,
      max,
      p95
    })+'\n')
  }
}
