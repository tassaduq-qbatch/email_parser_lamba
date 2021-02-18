// dependencies
const AWS = require('aws-sdk')
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser
const { createAuthToken, createS3Object } = require('./src/db')
const { print, decode, parseText, findTenant, parseEmails, ENV, tokenText, tenantInfo } = require('./src/utils')
const { getTenantId, credentialsMapping } = require('./src/request')
const { AWS_SES_KEY_ID, AWS_SES_SECRET_KEY } = ENV

AWS.config.update({ accessKeyId: AWS_SES_KEY_ID, secretAccessKey: AWS_SES_SECRET_KEY })
const s3 = new AWS.S3()

exports.handler = async (event, context) => {
  try {
    const {
      bucket: { name: Bucket },
      object: { key: Key }
    } = event.Records[0].s3
    tenantInfo.name = null

    const s3Key = Key.replace('scepteremail_/', '')
    const file = await s3.getObject({ Bucket, Key }).promise()
    const parsed = await simpleParser(file.Body.toString())
    const mapping = await credentialsMapping()
    const forwardedEmail = findTenant(parsed, mapping)
    if (/^\d+$/.test(forwardedEmail)) {
      print('no need to call api')
      tenantInfo.name = `tenant_${forwardedEmail}`
    } else {
      const result = await getTenantId(forwardedEmail)
      if (result.tenant) tenantInfo.name = decode(result.tenant, 4)
      else print('no tenant found for this email', { s3Key, forwardedEmail })
    }
    print('tenantInfo.name:', tenantInfo.name)

    const status = tokenText.some(txt => String(parsed.subject).toLowerCase().includes(txt)) ? 'done' : 'pending'
    if (status === 'done') await parseTokenDetails({ parsed, s3Key })

    await createS3Object({
      s3_key: s3Key,
      email_date: parsed.date,
      status,
      subject: parsed.subject,
      created_at: new Date(),
      updated_at: new Date(),
      email_to: parseEmails(parsed.to && parsed.to.text),
      email_from: parseEmails(parsed.from && parsed.from.text)
    })
  } catch (e) {
    print(e)
  }
}

async function parseTokenDetails ({ parsed, s3Key }) {
  print('parsing token details')
  const $ = cheerio.load(parsed.html)
  const approvalURL = $("a:contains('https://www.amazon.com/a/c/r?k')").text().replace(/\s/, '').trim()
  const token = $("p[class='otp']").text() || parseText(parsed.text, /confirmation code:\s*(\d+)/i, 1)
  const data = {
    account: parsed.to.text,
    approval_url: approvalURL,
    s3_key: s3Key,
    auth_code: token,
    created_at: new Date(),
    updated_at: new Date()
  }
  print('token details: ', data)
  if (data.approval_url || data.auth_code) await createAuthToken(data)
}
