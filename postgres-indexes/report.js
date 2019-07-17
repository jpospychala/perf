const fs = require('fs')
const { execSync } = require('child_process')

main()

async function main() {
  const runs = fs.readdirSync('results/runs')
    .reduce((acc, run) => acc.concat(
        fs.readFileSync(`results/runs/${run}`).toString().split('\n')
        .map(l => { try { return JSON.parse(l) } catch (ex) {throw new Error(`${run}/${l}: ${ex}`);}})
      )
    , [])
  const envs = fs.readdirSync('results/envs')
    .map(env => JSON.parse(fs.readFileSync(`results/envs/${env}`).toString()))

  const names = runs.reduce((acc, r) => acc.includes(r.name) ? acc : acc.concat(r.name), [])
  yaxes = ['tps', 'min', 'max', 'p95']
  xaxes = ['n']
  
  names.forEach(name => 
    xaxes.forEach(x =>
      yaxes.forEach(y => plot(runs, name, x, y))
    )
  )
}

function plot(runs, name, x, y) {
  const p = pivot(runs.filter(r => r.name === name), 'serie', x, y)
  const seriesCount = p[0].length
  const series = [...new Array(seriesCount).keys()].map(i => 
    `'tmp.dat' using 1:${i+2} with lines title columnhead(${i+1})`).join(',')
  try { fs.mkdirSync('report', { recursive: true }); } catch (ex) {}
  const title = `${y} of ${name} to ${x}`
  const fileName = `report/${name}_${y}_${x}`
  fs.writeFileSync('tmp.dat', table(p))
  fs.writeFileSync('plot.pg', `
reset
set terminal png
set output "${fileName}.png"

set title "${title}"
set lmargin 9
set rmargin 2
set xlabel "${x}"
set ylabel "${y}"
set xtics
plot ${series}
`)
  execSync('gnuplot plot.pg')
  fs.unlinkSync('tmp.dat')
  fs.unlinkSync('plot.pg')
}

function pivot(input, colsCol, rowsCol, valCol) {
  const table = {}
  const colNames = []
  input.forEach(row => {
    const colName = row[colsCol]
    const rowName = row[rowsCol]
    const val = row[valCol]
    
    table[rowName] = table[rowName] || {}
    if (! colNames.includes(colName)) {
      colNames.push(colName)
    }
    table[rowName][colName] = val
  })
  const rowNames = Object.keys(table)
  const rows = rowNames.map(rowName => [rowName, ...colNames.map(col => table[rowName][col])])
  return [colNames.map(c => `"${c}"`), ...rows]
}

function table(input) {
  return input.map(row => row.join(' ')).join('\n')
}