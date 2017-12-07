import { getLogger, setFilter } from '@whitetrefoil/debug-log'
import * as meow                from 'meow'
import * as path                from 'path'
import { inspect }              from 'util'
import * as main                from './main'

setFilter('*')

const { debug } = getLogger(`/${path.relative(process.cwd(), __filename)}`)

const cli = meow(`
  Useage:
    pac-generate my-rules.yml

  Options:
    -o, --output              Output directory
    -h, --help                Show this help
    -v, --version             Show version number then exit
`, {
  flags: {
    output : { alias: 'o', default: '.', type: 'string' },
    help   : { alias: 'h' },
    version: { alias: 'v' },
  },
})

export function run() {
  debug(`All input: ${cli.input}`)
  debug(`All flags: ${inspect(cli.flags)}`)

  main.run(cli.input[0], cli.flags.output)
}
