const tenantInfo = {}
const keys = obj => Object.keys(obj)

module.exports = {
  keys,
  ENV: process.env,
  tenantInfo,
  tokenText: ['amazon authentication', 'security alert', 'amazon password assistance'],
  cols: body => keys(body).join(', '),
  print: (...msg) => console.log(...msg),
  vals: obj => Object.values(obj),
  last: arr => arr[arr.length - 1],
  tableName: tbName => (tenantInfo.name ? `\`${tenantInfo.name}.${tbName}\`` : tbName),
  encode: (str, rounds = 1) => [...Array(rounds)].reduce(token => Buffer.from(token).toString('base64'), str),
  decode: (str, rounds = 1) => [...Array(rounds)].reduce(token => Buffer.from(token, 'base64').toString('ascii'), str),
  parseRes: (res, type = 'json') => (type === 'text' ? res.text() : res.json())
}
