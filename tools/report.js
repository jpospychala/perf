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
    'tps': 'transactions per second [n]',
    'p95': '95 perentile [ms]',
    'min': 'min [ms]',
    'max': 'max [ms]',
  }[term] || term)

  const p = pivot(rows, 'serie', x, y)

  const style =  (p.length === 2 /* header + 1 row */) ? 'bars' : 'lines'

  const seriesCount = p[0].length

  const styles = {
    'bars': {
      title: `${name} ${explain(y)}`,
      series: () => [...new Array(seriesCount).keys()].map(i =>
        `'tmp.dat' using ${i+2} title columnhead(${i+1})`).join(','),
      gpstyles: `set style data histogram
set style histogram cluster gap 1
set style fill solid border -1
set xtics format ""
`
    },
    'lines': {
      title: `${explain(y)} of ${name} to ${explain(x)}`,
      series: () => [...new Array(seriesCount).keys()].map(i => {
        const linestyle = p[0].length < 8 ? 'lines' : 'linespoints'
        return `'tmp.dat' using 1:${i+2} with ${linestyle} title columnhead(${i+1})`
        }).join(','),
      gpstyles: `
      set xtics format ""
set xlabel "${explain(x)}"`
    }
  }

  const { title, gpstyles, series } = styles[style]

  try { fs.mkdirSync('report', { recursive: true }); } catch (ex) {}
  const fileName = `${dir}/report/`+[name.replace(/ /g, '_'), y, x, suffix].join('_')
  fs.writeFileSync(`${dir}/tmp.dat`, table(p))
  fs.writeFileSync(`${dir}/plot.pg`, `
reset
set terminal ${OUTPUT} size 800,400 background rgb 'white'
set output "${fileName}.${OUTPUT}"

set title "${title}"
set lmargin 9
set rmargin 30
set key outside
${gpstyles}
set ylabel "${explain(y)}"
plot ${series()}
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