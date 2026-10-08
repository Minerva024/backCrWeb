'use strict';
const mysql = require('mysql2');

// CAMBIA ESTA VARIABLE A 'PROD' PARA PASAR A PRODUCCIÓN
const AMBIENTE = 'QA';  //PROD

const dbConfig = {
  host     : '192.168.40.25',
  user     : 'root',
  password : '+4dM1n%Pc/',
  connectTimeout: 20000,
  database : AMBIENTE === 'QA' ? 'crmQA' : 'crmmovil',
  connectionLimit: 40 // Usar pool para optimizar consultas paralelas
};

const dbConn = mysql.createPool(dbConfig);

// Verificar la conexión del pool
dbConn.getConnection((err, connection) => {
  if (err) {
      console.error('Error connecting to MySQL pool:', err);
  } else {
      console.log(`Database Pool Connected to [${dbConfig.database}]!`);
      connection.release();
  }
});

module.exports = dbConn;