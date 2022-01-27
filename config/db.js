const path = require('path')
require('dotenv').config({path:path.resolve(__dirname+'/.env')})

const { Pool } = require('pg')


// console.log(process.env.DB_USER)

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool =  new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    // ssl: { rejectUnauthorized: false }
})


module.exports = {pool}