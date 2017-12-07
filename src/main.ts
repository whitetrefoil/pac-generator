import { getLogger, setFilter } from '@whitetrefoil/debug-log'
import * as fs                  from 'fs-extra'
import * as path                from 'path'
import * as yaml                from 'js-yaml'
import { inspect }              from 'util'

export interface IProxySetting {
  filename: string
  proxy: string
}

export interface IPac {
  rules: string[]
  proxies: IProxySetting[]
}

interface IRulesGroup {
  equal: string[]
  dnsDomainIs: string[]
  shExpMatch: string[]
}

interface StringObject {
  [key: string]: string
}

setFilter('*')

const { debug } = getLogger(`/${path.relative(process.cwd(), __filename)}`)

function parseRules(raw: string[]): IRulesGroup {
  debug(`parsing rules: ${raw}`)

  const rules: IRulesGroup = {
    equal      : [],
    dnsDomainIs: [],
    shExpMatch : [],
  }

  for (const item of raw) {
    if (item[0] === '=') {
      rules.equal.push(item)
      continue
    }

    const foundWildcard = item.match(/\*/g)

    if (foundWildcard == null) {
      rules.dnsDomainIs.push(item)
      continue
    }

    if (foundWildcard.length === 1 && item.substr(0, 2) === '*.') {
      rules.dnsDomainIs.push(item.substr(2))
      continue
    }

    rules.shExpMatch.push(item)
  }

  return rules
}

/**
 * @param input - YAML file contains rules and configs.
 * @param outputDir - Output directory related to cwd.
 */
export function run(input: string, outputDir: string) {
  fs.readFile(input, 'utf-8')

    .then<IPac>(
      (content) => yaml.safeLoad(content) as IPac,
      (error) => {
        if (error.code === 'ENOENT') {
          console.error(`Cannot open ${input}. Aborting...`)
        }
        console.error(error.message)
        return process.exit(-1)
      },
    )

    .then<StringObject>((result) => {
      debug(`Composing ${inspect(result)}`)

      const rules = parseRules(result.rules)

      debug(`Parsed rules: ${rules}`)

      const outputFiles: { [key: string]: string } = {}

      for (const proxy of result.proxies) {
        let output = 'function FindProxyForURL(url,host){host=host.toLowerCase();if(false\n'

        for (const equal of rules.equal) {
          output += `||host==="${equal}"\n`
        }

        for (const dnsDomainIs of rules.dnsDomainIs) {
          output += `||dnsDomainIs(host,"${dnsDomainIs}")\n`
        }

        for (const shExpMatch of rules.shExpMatch) {
          output += `||shExpMatch(url,"${shExpMatch}")\n`
        }

        output += `) {return '${proxy.proxy}';}return 'DIRECT';}`

        outputFiles[proxy.filename] = output
      }

      return outputFiles
    }, (error) => {
      console.error(`Failed to parse YAML:\n${error.message}`)
      return process.exit(-2)
    })

    .then<void>((outputFiles) => {
      for (const output in outputFiles) {
        if (outputFiles.hasOwnProperty(output)) {
          const dir = path.join(process.cwd(), outputDir)
          fs.ensureDirSync(dir)
          fs.writeFileSync(`${path.join(dir, output)}.pac`, outputFiles[output])
        }
      }

      // tslint:disable-next-line:no-console
      console.log(`Successfully generated files under ${outputDir}.`)
    }, (error) => {
      console.error(`Failed to compose PAC file, detail:\n${error.stack}`)
      return process.exit(-3)
    })

    .catch((error) => {
      console.error(`Failed to save PAC files, detail:\n${error.stack}`)
      return process.exit(-4)
    })
}
