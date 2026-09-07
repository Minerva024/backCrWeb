'use strict';
const mysql = require('mysql2');
//local mysql db connection
const dbConn = mysql.createConnection({
  //host     : 'localhost',
  host     : '192.168.40.25',
  user     : 'root',
  password : '+4dM1n%Pc/',
  //password: '',
  database : 'crmmovil'
});
dbConn.connect(function(err) {
  if (err) throw err;
  console.log("Database Connected!");
});
module.exports = dbConn;