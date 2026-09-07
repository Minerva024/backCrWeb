'use strict';
const { PerformanceObserver, performance } = require('perf_hooks');
var util = require('util');
var hana = require('@sap/hana-client');

var connOptions = {
    serverNode: '192.168.40.19:30015',
    uid: 'B1ADMIN',
    pwd: 'B1AdminMIN$',
    //databaseName: 'SBO_MINERVA_PRODUCTIVOS',
    sslValidateCertificate: true
};

module.exports = connOptions;