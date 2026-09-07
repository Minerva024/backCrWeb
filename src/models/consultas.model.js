'use strict';

const moment = require('moment');
moment.locale('es');
var dbConnHana = require('./../../config/configSapHana');
const hana = require('@sap/hana-client');
const mailer = require('./../templates/ofertaventa');
var dbConnMySQL = require('./../../config/configMySQL');

//Servicio solicitado por DCH en donde se debe contar de año a año
/*
    El numero de visitas realizadas en ese periodo a los clientes.
    EL numero de cotizaciones realizadas a los clientes en ese periodo.
    El numero de pedidos ingresado a los clientes.
    El numero de las muestras solicitadas por ese cliente.
    El numero de reclamos ingresados por el cliente.
*/
var consultas = function () { }

function listarrepresentanteventas() {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            `SELECT concat(nombres,' ', apellidos) as nombre, slpcode FROM usuarios where isactive = 1 and slpcode != 0;`,
            (err, res) => {
                if (err) return reject(err);
                resolve(res);
            }
        );
    });
}

function obtenerinformacioncliente(auxcardcode, auxfechainicio, auxfechafin) {
    return new Promise((resolve, reject) => {
        dbConnMySQL.query(
            `CALL pa_consultadatoscrm(?,?,?)`,
            [
                auxcardcode,
                auxfechafin,
                auxfechainicio
            ],
            (err, res) => {
                if (err) return reject(err);
                resolve(res[0][0]);
            }
        );
    });
}

function obtenerclientesrepresentanteventas(auxslpcode) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT T0."CardCode", 
            T0."CardType", 
            T0."CardName", 
            T0."Phone1", 
            T0."Cellular" 
            FROM "EC_SBO_MINERVA_PRO".OCRD T0 
            INNER JOIN "EC_SBO_MINERVA_PRO".OSLP T1 ON T0."SlpCode" = T1."SlpCode" 
            WHERE T0."validFor"='Y' and (T0."CardType" = 'C' or T0."CardType" = 'L' ) 
        `;
        if (auxslpcode != 0) {
            query += ` and T0."SlpCode" = ` + auxslpcode + ` ORDER BY T0."CardName" asc`;
            //params.push(auxslpcode);
        }

        const conn = hana.createConnection();

        conn.connect(dbConnHana, (err) => {
            if (err) return reject(err);

            conn.exec(query, (err, res) => {
                conn.disconnect();
                if (err) return reject(err);
                resolve(res);
            });
        });
    });
}

consultas.consultareporteDCH = async function (result) {
    try {
        const hoy = new Date();

        // Día 0 del siguiente mes = último día del mes actual
        const ultimaFecha = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        const primeraFecha = new Date(hoy.getFullYear() - 1, hoy.getMonth(), 1);
        const fechafinal = `${primeraFecha.getFullYear()}-${String(primeraFecha.getMonth() + 1).padStart(2, '0')
            }-${String(primeraFecha.getDate()).padStart(2, '0')}`;
        const fechainicial = ultimaFecha.toISOString().split('T')[0];
        const listadovendedores = await listarrepresentanteventas();



        let respuesta = [];
        for (let item of listadovendedores) {
            let aux = {
                vendedor: item.nombre,
                slpcode: item.slpcode,
                infoclientes: []
            }

            //Consulto los clientes activos del cliente.
            let clientes = await obtenerclientesrepresentanteventas(item.slpcode);
            for (let item2 of clientes) {
                let infocrm = await obtenerinformacioncliente(item2.CardCode, fechainicial, fechafinal);     
                
                let aux2 = {
                    cardcode: item2.CardCode,
                    cardname: item2.CardName,
                    nvisitasprogramadas: infocrm.nvisitasprogramadas,
                    nvisitasasistidas: infocrm.nvisitasasistidas,
                    nvisitasnoasistidas: infocrm.nvisitasnoasistidas,
                    ncotizaciones: infocrm.ncotizaciones,
                    ncotizacionesaceptadas: infocrm.ncotizacionesaceptadas,
                    ncotizacionesrechazadas: infocrm.ncotizacionesrechazadas,
                    ncotizacionespendientes: infocrm.ncotizacionespendientes,
                    nordenesventa: infocrm.nordenesventa,
                    nmuestrassolicitadas: 0,
                    nmuestrasaceptadas: 0,
                    nmuestrasrechazadas: 0,
                    nmuestraspendientes: 0,
                    nreclamos: 0
                }
                //Debo realizar la consulta de las cotizaciones, muestras, reclamos, pedidos, etc.
                
                aux.infoclientes.push(aux2);
            }
            respuesta.push(aux);
        }
        let datosenviar = {
            Consulta: "Consulta solicitada por DCH",
            Fechainicio: fechafinal,
            Fechafin: fechainicial,
            Resultados: respuesta
        }

        result(null, datosenviar);
    } catch (error) {
        console.log("Error al obtener la consulta.");
        result(error, null);
    }
}

module.exports = consultas;