import { version } from '../package.json'
import chalk from 'chalk'

export default function logo() {
  const _ = chalk
  const a = '#00abab' // cyan
  const b = '#009999' // dark cyan
  const c = '#006666' // darker cyan
  const d = '#009696' // darkest cyan
  return _.hex(a)(' ▄▄▄▄▄▄▄▄ ▄▄▄▄ ▄▄▄▄▄▄▄▄ ▄▄▄▄ ▄▄▄▄') + '\n'
       + _.hex(a)('  ███ ███  ███  ███ ███  ███  ███') + '\n'
       + _.hex(a)('  ███ ▀▀▀  ███  ███ ███  ███  ███') + '\n'
       + _.hex(a)('  ▀▀▀▀███  ██') + _.bgHex(a)('░') + _.hex(a)('  ███▀███  ▄██▀▀██▄') + '\n'
       + _.hex(a)('  ███') + _.hex(a)(' ██') + _.bgHex(b)('░') + _.hex(a)('  ███') + _.hex(a)('  ███ ███  ██') + _.bgHex(b)('░') + '  ' + _.hex(a)('███') + '\n'
       + _.hex(a)('  ██') + _.bgHex(a).hex(d)('▓') + ' ' + _.hex(a)('██') + _.bgHex(a).hex(d)('▓') + '  ' + _.hex(a)('██') + _.bgHex(b)('░') + '  ' + _.hex(a)('█') + _.bgHex(a).hex(d)('▄') + _.bgHex(a).hex(d)('█') + _.hex(a)(' ██') + _.bgHex(a).hex(d)('▓') + _.hex(a)('  ██') + _.bgHex(a).hex(d)('▓') + '  ' + _.bgHex(a).hex(d)('▓') + _.hex(a)('██') + '\n'
       + _.hex(d)('  ') + _.bgHex(a).hex(d)('▄▀█') + _.hex(d)(' █') + _.bgHex(a).hex(d)('▄█') + '  ' + _.bgHex(a).hex(a)('██') + _.bgHex(a).hex(d)('▓') + '  ' + _.hex(d)('█') + _.bgHex(d).hex(a)('▄') + _.hex(d)('█') + ' ' + _.hex(a)('█') + _.bgHex(a).hex(d)('▄█') + '  ' + _.bgHex(a).hex(d)('▄') + _.bgHex(a).hex(d)('▀') + _.hex(d)('█') + '  ' + _.hex(d)('█') + _.bgHex(a).hex(d)('▄') + _.bgHex(a).hex(d)('▀') + '\n'
       + _.hex(d)(' ▄███████  ') + _.bgHex(a).hex(d)('▄') + _.hex(d)('██ ▄███ ███ ▄███ ▄███') + ' '
       + _.bgWhite.gray(` v${version.replace(/\.0$/, '')} `) + '\n'
}
