const fetch = require('node-fetch')
const { encode, ENV, print, parseRes } = require('./utils')

const request = async (endpoint, reqOpts = {}) => {
  const url = ENV.ECOM_API_URL + endpoint
  const token = encode([ENV.AO_API_AUTH_USER, ENV.AO_API_AUTH_PASSWORD].join(':'))
  const body = ['POST', 'PUT'].includes(reqOpts.method) ? JSON.stringify(reqOpts.body) : null
  try {
    const response = await fetch(url, {
      method: reqOpts.method,
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`
      }
    })

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

const getTenantId = email => request(`tenant/token/${email}`)

module.exports = {
  request,
  getTenantId
}
