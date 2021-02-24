const fetch = require('node-fetch')
const { encode, ENV, print, parseRes, sleep } = require('./utils')

const hitApi = async (url, opts) => {
  try {
    return await fetch(url, opts)
  } catch (error) {
    print('error:', error.message)
    return error
  }
}

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
      response = await hitApi(url, opts)
      if (response.status && ![500, 501, 502, 503].includes(response.status)) break
      await sleep(2)
      tries++
    }

    if (!response.ok) {
      const error = response.status ? await parseRes(response, reqOpts.type) : response
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
