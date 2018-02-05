const pg = require('pg')

const dbConfig = {
  user: 'sbjiesnonpxllc',
  password: '0b3f9823d317a6f156783b20d9c3027ac1f4c74a33adb0f538afe1ca07e9757b',
  database: 'd275nhnnb43sml',
  host: 'ec2-23-23-92-179.compute-1.amazonaws.com',
  port: '5432',
}

const pool = new pg.Pool(dbConfig)
pool.on('error', function (err) {
  console.error('idle client error', err.message, err.stack)
})

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  }
}