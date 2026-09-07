'use strict';
const mysql = require('mysql2');
//local mysql db connection
const dbConnImpor = mysql.createConnection({
  //host     : 'localhost',
  host     : '192.168.40.25',
  user     : 'root',
  password : '+4dM1n%Pc/',
  database : 'informebodega'
});
dbConnImpor.connect(function(err) {
  if (err) throw err;
  console.log("Database Connected!");
});
module.exports = dbConnImpor;