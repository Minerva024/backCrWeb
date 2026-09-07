const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const configsql = require('./config/configsql');
const https = require('https');
const http = require('http');
const fs = require('fs');

// create express app
const app = express();
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));
app.use(cors({
    //origin: 'http://localhost:5005'
    origin: '*'
}));


// Setup server port
const port = process.env.PORT || 5014;
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json());

//app.use(express.text());
app.use(express.json({limit: '250mb'}));
app.use(express.urlencoded({limit: '250mb'}));

// define a root route
app.get('/', (req, res) => {
    res.send("Hello World");
});

// Require employee routes
const vendedorRoutes = require('./src/routes/vendedor.routes');
const crmRoutes = require('./src/routes/crm.routes');
const muestrasRoutes = require('./src/routes/muestras.routes');
const consultasRoutes = require('./src/routes/consultas.routes');
// using as middleware
app.use('/api/v1/vendedor', vendedorRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/muestras', muestrasRoutes);
app.use('/api/v1/consultas', consultasRoutes);
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;


const options = {
 
  //key: fs.readFileSync('/home/minerva/Certificado/minerva.com.ec.key'),
  //cert: fs.readFileSync('/home/minerva/Certificado/minerva.fullchain.crt')
  key: fs.readFileSync('/home/minerva/Certificado/privkey.pem'),
  cert: fs.readFileSync('/home/minerva/Certificado/fullchain.pem')

};


// listen for requests
/*app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});*/

//Crear servidor HTTPS
https.createServer(options, app).listen(port, () => {
  console.log(`Servidor HTTPS escuchando en el puerto ${port}`);
});

