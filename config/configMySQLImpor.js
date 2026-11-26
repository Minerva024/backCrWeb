'use strict';
const mysql = require('mysql2');
//local mysql db connection
const dbConnImpor = mysql.createConnection({
  //host     : 'localhost',
  host     : '192.168.40.25',
  user     : 'root',
  password : '+4dM1n%Pc/',
  database : 'informebodega',
  connectTimeout: 20000
});
dbConnImpor.connect(function(err) {
  if (err) {
    console.error("Error al conectar a MySQL Importaciones (192.168.40.25:3306):", err.message);
  } else {
    console.log("Database Connected to informebodega!");
  }
});
module.exports = dbConnImpor;