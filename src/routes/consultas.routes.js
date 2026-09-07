const express = require('express')
const router = express.Router()
const consultasController = require('../controllers/consultas.controller');
const jwt = require('jsonwebtoken');
const { clavejwtbeartoke } = require('../../config/configvariables');


router.get('/consultainformacioncrm',consultasController.consultadeinfocrm);

module.exports = router;