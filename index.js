// dependencies
const AWS = require("aws-sdk")
const cheerio = require("cheerio")
const simpleParser = require("mailparser").simpleParser
const { createAuthToken, createS3Object } = require("./src/db")
const { ENV, print, tokenText } = require("./src/utils")
const { AWS_SES_KEY_ID, AWS_SES_SECRET_KEY } = ENV

AWS.config.update({ accessKeyId: AWS_SES_KEY_ID, secretAccessKey: AWS_SES_SECRET_KEY })
const s3 = new AWS.S3()

exports.handler = async (event, context) => {
  try {
    const {
      bucket: { name: Bucket },
      object: { key: Key }
    } = event.Records[0].s3

    const s3Key = Key.replace("scepteremail_/", "")
    const file = await s3.getObject({ Bucket, Key }).promise()
    const parsed = await simpleParser(file.Body.toString())

    const status = tokenText.some(txt => String(parsed.subject).toLowerCase().includes(txt)) ? "done" : "pending"
    if (status === "done") await parseTokenDetails({ parsed, s3Key })

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

async function parseTokenDetails({ parsed, s3Key }) {
  print("parsing token details")
  var $ = cheerio.load(parsed.html)
  var approvalURL = $("a:contains('https://www.amazon.com/a/c/r?k')").text().replace(/\s/, "").trim()
  var token = $("p[class='otp']").text()
  const data = {
    account: parsed.to.text,
    approval_url: approvalURL,
    s3_key: s3Key,
    auth_code: token
  }
  print("token details: ", data)
  if (data.approval_url || data.auth_code) await createAuthToken(data)
}
