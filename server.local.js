const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');

// create express app
const app = express();
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(cors({ origin: '*' }));

// Setup server port
const port = process.env.PORT || 5014;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb' }));

app.get('/', (req, res) => {
    res.send("Backend CRM Local Activo");
});

// Rutas (mismas que produccion)
const vendedorRoutes = require('./src/routes/vendedor.routes');
const crmRoutes = require('./src/routes/crm.routes');
const muestrasRoutes = require('./src/routes/muestras.routes');
const consultasRoutes = require('./src/routes/consultas.routes');

app.use('/api/v1/vendedor', vendedorRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/muestras', muestrasRoutes);
app.use('/api/v1/consultas', consultasRoutes);

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// Iniciar servidor HTTP en local
http.createServer(app).listen(port, () => {
    console.log(`=========================================`);
    console.log(` Servidor LOCAL corriendo en:`);
    console.log(` http://localhost:${port}/api/v1/`);
    console.log(` Misma BD (192.168.40.25) conectada.`);
    console.log(`=========================================`);
});