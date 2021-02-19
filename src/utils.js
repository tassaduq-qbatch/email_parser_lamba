const tenantInfo = {}
const keys = obj => Object.keys(obj)
const mattEmails = ['matt@sceptermarketing.com', 'manual_fulfillment@scepteremail.com']
const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi

module.exports = {
  keys,
  ENV: process.env,
  tenantInfo,
  sleep: (secs = 1) => new Promise(resolve => setTimeout(resolve, secs * 1000)),
  tokenText: ['amazon authentication', 'security alert', 'amazon password assistance', 'forwarding confirmation'],
  cols: body => keys(body).join(', '),
  print: (...msg) => console.log(...msg),
  vals: obj => Object.values(obj),
  last: arr => arr[arr.length - 1],
  tableName: tbName => (tenantInfo.name ? `\`${tenantInfo.name}.${tbName}\`` : tbName),
  encode: (str, rounds = 1) => [...Array(rounds)].reduce(token => Buffer.from(token).toString('base64'), str),
  decode: (str, rounds = 1) => [...Array(rounds)].reduce(token => Buffer.from(token, 'base64').toString('ascii'), str),
  parseRes: (res, type = 'json') => (type === 'text' ? res.text() : res.json()),
  parseText: (str, regex, step) => {
    try {
      return str.match(regex)[step]
    } catch (err) {
      return ''
    }
  },
  findTenant: (parsed, mapping) => {
    const header = parsed.headers.get('x-forwarded-to')
    const emails = [String(header), parsed.to && parsed.to.text]
      .filter(x => x)
      .map(x => x.match(emailRegex))
      .flat()
      .filter(x => x)

    const tenantEmail = emails.find(email => mapping[email.toLowerCase()])
    if (tenantEmail) {
      console.log('found via mapping:', tenantEmail, 'id:', mapping[tenantEmail.toLowerCase()])
      return mapping[tenantEmail.toLowerCase()]
    }
    let email
    if (header) {
      email = Array.isArray(header) ? header.shift() : header
      email = email.split(',').find(x => x.includes('emails.ecomcircles.com')) || email.split(',').pop()
    } else {
      email = parsed.to.text
    }
    email = String(email).toLowerCase().trim()
    if (email.includes(' ') && email.match(emailRegex)) email = email.match(emailRegex).shift()
    mattEmails.some(mattEmail => email.includes(mattEmail)) && (email = 'manual_fulfillment@scepteremail.com')
    return email
  },
  parseEmails: str =>
    [String(str).toLowerCase().match(emailRegex)]
      .flat()
      .filter(x => x)
      .join(', ')
}
