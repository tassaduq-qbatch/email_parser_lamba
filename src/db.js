const { ENV } = require('./utils');
const mysql = require('serverless-mysql');
const { AO_DB_USERNAME: user, AO_DB_PASSWORD: password, AO_DB_HOST: host, AO_DB_NAME: database } = ENV;

const db = config => mysql({ config });
const aoDB = db({ user, password, host, database });

const insertQuery = (tableName, body) =>
  aoDB.query(`INSERT INTO ${tableName}(${Object.keys(body).join(', ')}) VALUES(?)`, [Object.values(body)]);

const createAuthToken = body => insertQuery('auth_tokens', body);
const createS3Object = body => insertQuery('s3_objects', body);
const getActiveAccounts = () => aoDB.query("SELECT * FROM account WHERE status='active'");

module.exports = { createAuthToken, createS3Object };
