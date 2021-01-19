// dependencies
const AWS = require('aws-sdk')
const cheerio = require('cheerio')
const simpleParser = require('mailparser').simpleParser
const { createAuthToken, createS3Object } = require('./src/db')
const { ENV, print, tokenText, tenantInfo, decode, parseText, mattEmails } = require('./src/utils')
const { getTenantId } = require('./src/request')
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
    const forwardHeader = parsed.headers.get("x-forwarded-to")
    let forwardedEmail = forwardHeader ? (Array.isArray(forwardHeader) ? forwardHeader.shift() : forwardHeader) : parsed.to.text
    if (mattEmails.some(mattEmail => String(forwardedEmail).includes(mattEmail))) forwardedEmail = 'manual_fulfillment@scepteremail.com'
    const result = await getTenantId(forwardedEmail)

    if (result.tenant) tenantInfo.name = decode(result.tenant, 4)
    else print('no tenant found for this email', { s3Key, forwardedEmail })
    print('tenantInfo.name:', tenantInfo.name)

    const status = tokenText.some(txt => String(parsed.subject).toLowerCase().includes(txt)) ? 'done' : 'pending'
    if (status === 'done') await parseTokenDetails({ parsed, s3Key })

    await createS3Object({
      s3_key: s3Key,
      email_date: parsed.date,
      status,
      subject: parsed.subject
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
    auth_code: token
  }
  print('token details: ', data)
  if (data.approval_url || data.auth_code) await createAuthToken(data)
}
