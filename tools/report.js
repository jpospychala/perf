const fs = require('fs')
const { execSync } = require('child_process')

const dir = process.argv[2] || ''
const OUTPUT = process.argv[3] || 'svg'

main(dir)

async function main(dir) {
  const runs = fs.readdirSync(`${dir}results/runs`)
    .reduce((acc, run) => acc.concat(
        fs.readFileSync(`${dir}/results/runs/${run}`).toString().split('\n')
        .filter(l => !!l)
        .map(l => { try { return JSON.parse(l) } catch (ex) {throw new Error(`${run}/${l}: ${ex}`);}})
      )
    , [])
  //const envSpecs = fs.readdirSync(`${dir}/results/envs`)
  //  .map(env => JSON.parse(fs.readFileSync(`${dir}/results/envs/${env}`).toString()))

  const envs = uniq(r => r.env, runs)
  const names = uniq(r => r.name, runs)
  yaxes = ['tps', 'min', 'max', 'p95']
  xaxes = ['n']
  
  envs.forEach(env =>
    names.forEach(name => 
      xaxes.forEach(x =>
        yaxes.forEach(y => {
          const rows = runs.filter(r => r.name === name && r.env === env)
          if (rows.length > 0) {
            plot(rows, name, x, y, env, dir)
          }
        })
      )
    )
  )
}

function plot(rows, name, x, y, suffix, dir) {
  const explain = (term) => ({
    'tps': 'transactions per second',
    'p95': '95 perentile',
  }[term] || term)

  const p = pivot(rows, 'serie', x, y)
  const seriesCount = p[0].length
  const linestyle = p[0].length < 8 ? 'lines' : 'linespoints'
  const series = [...new Array(seriesCount).keys()].map(i => 
    `'tmp.dat' using 1:${i+2} with ${linestyle} title columnhead(${i+1})`).join(',')
  try { fs.mkdirSync('report', { recursive: true }); } catch (ex) {}
  const title = `${explain(y)} of ${name} to ${explain(x)}`
  const fileName = `${dir}/report/`+[name.replace(/ /g, '_'), y, x, suffix].join('_')
  fs.writeFileSync(`${dir}/tmp.dat`, table(p))
  fs.writeFileSync(`${dir}/plot.pg`, `
reset
set terminal ${OUTPUT}
set output "${fileName}.${OUTPUT}"

set title "${title}"
set lmargin 9
set rmargin 2
set xlabel "${explain(x)}"
set ylabel "${explain(y)}"
set xtics
plot ${series}
`)
  execSync(`gnuplot ${dir}/plot.pg`)
  fs.unlinkSync(`${dir}/tmp.dat`)
  fs.unlinkSync(`${dir}/plot.pg`)
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
  const rows = rowNames.map(rowName => [rowName, ...colNames.map(col => table[rowName].hasOwnProperty(col) ? table[rowName][col] : '-')])
  return [colNames.map(c => `"${c}"`), ...rows]
}

function table(input) {
  return input.map(row => row.join(' ')).join('\n')
}

function uniq(fn, list) {
  return list.reduce((acc, elem) => acc.includes(fn(elem)) ? acc : acc.concat(fn(elem)), [])
}