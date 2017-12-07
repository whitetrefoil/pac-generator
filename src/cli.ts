import * as meow from 'meow'
import * as main from './main'

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
  main.run(cli.input[0], cli.flags.output)
}
