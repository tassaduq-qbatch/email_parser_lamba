const fetch = require('node-fetch')
const { encode, ENV, print, parseRes, sleep } = require('./utils')

const request = async (endpoint, reqOpts = {}) => {
  let tries = 0
  const url = ENV.ECOM_API_URL + endpoint
  const token = encode([ENV.AO_API_AUTH_USER, ENV.AO_API_AUTH_PASSWORD].join(':'))
  const body = ['POST', 'PUT'].includes(reqOpts.method) ? JSON.stringify(reqOpts.body) : null
  const opts = {
    method: reqOpts.method,
    body,
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${token}` }
  }
  try {
    let response
    while (tries < 2) {
      response = await fetch(url, opts)
      if (response.status !== 500) break
      await sleep()
      tries++
    }

    if (!response.ok) {
      const error = await parseRes(response, reqOpts.type)
      throw error
    }

    return parseRes(response, reqOpts.type)
  } catch (err) {
    err.url = url
    print(err)
    return err
  }
}

module.exports = {
  request,
  getTenantId: email => request(`tenant/token/${email}`),
  credentialsMapping: () => request('credentials_mapping')
}
