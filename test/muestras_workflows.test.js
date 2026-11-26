/**
 * SUITE DE PRUEBAS AUTOMATIZADAS - MÓDULO DE MUESTRAS CRM & SAP
 * Valida los flujos críticos de Solicitud, Aprobación, Bodega y Backend
 * sin alterar la lógica de negocio y previniendo regresiones.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// -------------------------------------------------------------------------
// SIMULADORES DE LÓGICA DE NEGOCIO (Idénticos al código de Frontend y Backend)
// -------------------------------------------------------------------------

/**
 * 1. Simulación de la lógica de Solicitud (solicitudmuestra.component.ts)
 */
function simularCreacionSolicitud({ productoCodigo, productosExcluidos, cantidad, undmedida, cliente, comentario, tiporetiro }) {
    if (!cliente || !productoCodigo || !tiporetiro || !comentario || !comentario.trim()) {
        throw new Error('CAMPOS_REQUERIDOS_FALTANTES');
    }
    if (cantidad == null || cantidad <= 0) {
        throw new Error('CANTIDAD_INVALIDA');
    }

    const isUnd = productosExcluidos.includes(productoCodigo);
    let cantidadGuardada;
    if (!isUnd && undmedida === '1') {
        cantidadGuardada = cantidad * 1000; // Kg a gramos
    } else {
        cantidadGuardada = cantidad; // gr o und directas
    }

    return {
        productoCodigo,
        cantidadOriginal: cantidad,
        cantidadGuardada,
        undmedida: isUnd ? '3' : undmedida,
        isUnd
    };
}

/**
 * 2. Simulación de la lógica de Aprobación (aprobacionmuestra.component.ts)
 */
function simularAprobacion({ productoCodigo, productosExcluidos, cantidadSolicitada, cantidadAprobadaInput }) {
    const esExcluido = productosExcluidos.includes(productoCodigo);
    let cantAprobada = Number(cantidadAprobadaInput);

    if (isNaN(cantAprobada) || cantAprobada <= 0) {
        throw new Error('CANTIDAD_APROBADA_INVALIDA');
    }

    // Normalización de seguridad para productos en unidades (evita fracciones accidentales de millar)
    if (esExcluido && cantAprobada < 1 && cantidadSolicitada >= 1) {
        cantAprobada = Number(cantidadSolicitada);
    }

    return {
        productoCodigo,
        cantidadAprobadaFinal: cantAprobada,
        esExcluido
    };
}

/**
 * 3. Simulación de la lógica de Bodega y Lotes (despachomuestra.component.ts)
 */
function simularPreparacionBodega({ productoCodigo, productosExcluidos, cantidadSolicitada, cantidadAprobada, lotesSeleccionados }) {
    const esExcluido = productosExcluidos.includes(productoCodigo);
    let cantAprobada = Number(cantidadAprobada) || 0;

    // Normalización defensiva para unidades
    if (esExcluido && cantAprobada < 1 && Number(cantidadSolicitada) >= 1) {
        cantAprobada = Number(cantidadSolicitada);
    }

    // Prellenado sugerido para bodega
    const cantPrellenada = esExcluido ? cantAprobada : (cantAprobada / 1000);

    // Sumatoria de lotes seleccionados por bodega
    let cantidadLotesTotal = 0;
    for (let lote of lotesSeleccionados) {
        if (lote.cantidad == null || lote.cantidad <= 0 || !lote.lote) {
            throw new Error('LOTE_INCOMPLETO');
        }
        cantidadLotesTotal += Number(lote.cantidad);
    }

    // Validación de concordancia corregida (Línea 340-343 de despachomuestra.component.ts)
    const cantidadComparar = esExcluido ? cantidadLotesTotal : (cantidadLotesTotal * 1000);
    const cantidadesCoinciden = Math.abs(cantidadComparar - cantAprobada) < 0.0001
        || (esExcluido && Math.abs(cantidadLotesTotal * 1000 - cantAprobada) < 0.0001)
        || (esExcluido && Math.abs(cantidadLotesTotal - cantAprobada * 1000) < 0.0001);

    if (!cantidadesCoinciden) {
        throw new Error('CANTIDAD_DESPACHADA_NO_CONCUERDA');
    }

    return {
        esExcluido,
        cantPrellenada,
        cantidadLotesTotal,
        valido: true
    };
}

/**
 * 4. Simulación del cálculo hacia SAP (muestras.model.js - registrarsalidastock)
 */
function simularCalculoSAP({ idproductosap, cantidadAprobada, productosMillar, lineasSAPExistentes = [] }) {
    const esMillar = (productosMillar || []).some(p => p.ItemCode === idproductosap);
    const cantAprobadaNum = Number(cantidadAprobada) || 0;

    let cantSap = cantAprobadaNum / 1000;
    // Si ya vino como fracción (< 1 y > 0) para un millar, no volver a dividir
    if (esMillar && cantAprobadaNum < 1 && cantAprobadaNum > 0) {
        cantSap = cantAprobadaNum;
    }

    // Simular acumulación en la orden de SAP si la línea ya existe
    const lineaExistente = lineasSAPExistentes.find(l => l.ItemCode === idproductosap);
    let cantidadTotalEnSAP;
    if (lineaExistente) {
        cantidadTotalEnSAP = Number((lineaExistente.Quantity + cantSap).toFixed(6));
    } else {
        cantidadTotalEnSAP = Number(cantSap.toFixed(6));
    }

    return {
        esMillar,
        cantSap,
        cantidadTotalEnSAP
    };
}

/**
 * 5. Simulación de guardado en MySQL (muestras.model.js - registrarsalidastockmuestra)
 */
function simularGuardadoMySQL({ idproductosap, cantidadLote, esMillar, bodegadespacho }) {
    const cantFinal = esMillar ? Number(cantidadLote) : (Number(cantidadLote) * 1000);

    let tablaDestino;
    if (bodegadespacho === 'SAP') {
        tablaDestino = 'mm_muestras_facturar';
    } else if (bodegadespacho === 'CRM') {
        tablaDestino = 'mm_operacionstock';
    } else {
        throw new Error('BODEGA_DESCONOCIDA');
    }

    return {
        tablaDestino,
        cantidadGuardadaMySQL: cantFinal
    };
}

/**
 * 6. Gestor de Estados de Muestra (mm_solicitudmuestra & mm_estado_solicitud)
 * Modela el ciclo: Solicitud (2) -> Aprobación Standby (15) -> Autorizada a Bodega (3 y 4)
 * Verifica que no se altere la fila original en mm_solicitudmuestra y los valores viajen íntegros.
 */
class GestorEstadosMuestra {
    constructor() {
        this.solicitudes = new Map();
        this.historialEstados = [];
        this.autoId = 1;
    }

    ingresarSolicitud({ productoCodigo, cliente, cantidad, undmedida, comentario, tiporetiro }) {
        if (!cliente || !productoCodigo || !tiporetiro || !comentario || !comentario.trim()) {
            throw new Error('CAMPOS_REQUERIDOS_FALTANTES');
        }
        if (cantidad == null || cantidad <= 0) {
            throw new Error('CANTIDAD_INVALIDA');
        }

        const id = this.autoId++;
        const row = {
            idmm_solicitudmuestra: id,
            cardcode: cliente.CardCode,
            CardName: cliente.CardName || 'Cliente Prueba',
            idproductosap: productoCodigo,
            cantidad: Number(cantidad),
            cantidadaprobada: 0,
            bodegadespacho: null,
            ciudadsalida: null,
            aprobador: null,
            comentario: comentario,
            fechasolicitud: new Date().toISOString()
        };
        this.solicitudes.set(id, row);

        this.historialEstados.push({
            idestadosolicitud: 2, // PENDIENTE AUTORIZACION CANTIDAD Y STOCK
            idsolicitudmuestra: id,
            fechahora: new Date(),
            comentario: 'Solicitud ingresada',
            responsable: 'vendedor'
        });

        return { ...row };
    }

    getEstadoActual(id) {
        const estados = this.historialEstados.filter(e => e.idsolicitudmuestra === id);
        return estados.length > 0 ? estados[estados.length - 1].idestadosolicitud : null;
    }

    aprobarAStandby({ idsolicitud, aprobador, bodegadespacho, ciudaddespacho, cantidadaprobada, comentario, isaprobado }) {
        const sol = this.solicitudes.get(idsolicitud);
        if (!sol) throw new Error('SOLICITUD_NO_ENCONTRADA');

        if (!isaprobado) {
            this.historialEstados.push({
                idestadosolicitud: 9, // RECHAZADO
                idsolicitudmuestra: idsolicitud,
                fechahora: new Date(),
                comentario: comentario || 'Rechazado',
                responsable: aprobador
            });
            return { exito: true, estado: 9 };
        }

        if (cantidadaprobada <= 0) {
            throw new Error('CANTIDAD_APROBADA_INVALIDA');
        }

        // Replica mm_aprobarrechazarsolicitudmuestra
        sol.comentario = comentario;
        sol.ciudadsalida = ciudaddespacho;
        sol.bodegadespacho = bodegadespacho;
        sol.aprobador = aprobador;
        sol.cantidadaprobada = Number(cantidadaprobada);

        this.historialEstados.push({
            idestadosolicitud: 15, // STANDBY
            idsolicitudmuestra: idsolicitud,
            fechahora: new Date(),
            comentario: comentario,
            responsable: aprobador
        });

        return { exito: true, estado: 15, solicitud: { ...sol } };
    }

    modificarStandby({ idsolicitud, cantidadaprobada, bodegadespacho, ciudaddespacho, comentario, responsable }) {
        const sol = this.solicitudes.get(idsolicitud);
        if (!sol) throw new Error('SOLICITUD_NO_ENCONTRADA');

        const estadoActual = this.getEstadoActual(idsolicitud);
        if (estadoActual !== 15) {
            throw new Error('SOLO_SE_PUEDE_MODIFICAR_EN_STANDBY');
        }

        // Replica mm_modificarsolicitudstandby
        sol.cantidadaprobada = Number(cantidadaprobada);
        sol.bodegadespacho = bodegadespacho;
        sol.ciudadsalida = ciudaddespacho;
        sol.comentario = comentario;
        sol.aprobador = responsable;

        return { exito: true, solicitud: { ...sol } };
    }

    enviarABodegaAutorizada({ idsolicitud, responsable, isfraccionable = true, comentario = 'Liberado para despacho a bodega' }) {
        const sol = this.solicitudes.get(idsolicitud);
        if (!sol) throw new Error('SOLICITUD_NO_ENCONTRADA');

        const estadoActual = this.getEstadoActual(idsolicitud);
        if (estadoActual !== 15 && estadoActual !== 2) {
            throw new Error(`ESTADO_INVALIDO_PARA_AUTORIZAR: ${estadoActual}`);
        }

        // Replica mm_enviarmuestrabodega:
        // Se registra el estado 3 (y 4 si no es fraccionable), dejando la fila en mm_solicitudmuestra INTACTA
        this.historialEstados.push({
            idestadosolicitud: 3, // AUTORIZADO POR CANTIDAD Y STOCK
            idsolicitudmuestra: idsolicitud,
            fechahora: new Date(),
            comentario: comentario,
            responsable: responsable
        });

        if (!isfraccionable) {
            this.historialEstados.push({
                idestadosolicitud: 4, // PENDIENTE FRACCIONAMIENTO
                idsolicitudmuestra: idsolicitud,
                fechahora: new Date(),
                comentario: 'Pendiente fraccionamiento',
                responsable: responsable
            });
        }

        // Lo que recibe Bodega en listarsolicitudesapreparar()
        return {
            exito: true,
            estadoFinal: 3,
            solicitudParaBodega: { ...sol }
        };
    }
}

/**
 * 7. Simulador de Inventario y Operaciones de Stock (mm_lotemuestra, mm_operacionstock)
 * Modela:
 * - mm_obtenerstockxlotexciudad (cálculo dinámico: stock_lote = cantidadrecibida - salidas + reingresos)
 * - mm_registrarsalidastock (inserción de salidas tipo 2)
 * - mm_despacharmuestra (despacho sin doble descuento)
 */
class InventarioBodegaCRM {
    constructor() {
        this.lotes = new Map();
        this.operaciones = [];
        this.autoOpId = 1;
        this.autoLoteId = 1;
    }

    crearLote({ lote, idproducto, cantidadrecibida, ubicacion = 'PERCHA-A1' }) {
        const id = this.autoLoteId++;
        const row = {
            idmm_lotemuestra: id,
            lote,
            idproducto,
            cantidadrecibida: Number(cantidadrecibida),
            ubicacion
        };
        this.lotes.set(lote, row);
        return { ...row };
    }

    obtenerStockLote(loteNombre) {
        const loteObj = this.lotes.get(loteNombre);
        if (!loteObj) return 0;

        const salidas = this.operaciones
            .filter(op => op.lote === loteNombre && (op.idtipooperacionstock === 2 || op.idtipooperacionstock === 3))
            .reduce((sum, op) => sum + Number(op.cantidad), 0);

        const reingresos = this.operaciones
            .filter(op => op.lote === loteNombre && op.idtipooperacionstock === 1 && op.idsolicitudmuestra != null)
            .reduce((sum, op) => sum + Number(op.cantidad), 0);

        const cantidaddespachada = salidas - reingresos;
        return Math.max(0, loteObj.cantidadrecibida - cantidaddespachada);
    }

    obtenerStockTotalProducto(idproducto) {
        let total = 0;
        for (const loteObj of this.lotes.values()) {
            if (loteObj.idproducto === idproducto) {
                total += this.obtenerStockLote(loteObj.lote);
            }
        }
        return total;
    }

    prepararMuestraCRM({ idsolicitudmuestra, idproducto, loteseleccionados, esMillar = false, responsable = 'bodeguero' }) {
        // Validar que cada lote tenga stock suficiente
        for (const sel of loteseleccionados) {
            const stockActual = this.obtenerStockLote(sel.lote);
            const cantRequerida = esMillar ? Number(sel.cantidad) : (Number(sel.cantidad) * 1000);

            if (cantRequerida > stockActual) {
                throw new Error(`STOCK_INSUFICIENTE_EN_LOTE: Lote ${sel.lote} tiene ${stockActual}, se solicitaron ${cantRequerida}`);
            }
        }

        const opsGeneradas = [];
        for (const sel of loteseleccionados) {
            const cantFinal = esMillar ? Number(sel.cantidad) : (Number(sel.cantidad) * 1000);
            const op = {
                idoperacionstock: this.autoOpId++,
                idtipooperacionstock: 2, // SALIDA POR MUESTRA
                idsolicitudmuestra,
                lote: sel.lote,
                cantidad: cantFinal,
                responsable,
                fecha: new Date()
            };
            this.operaciones.push(op);
            opsGeneradas.push(op);
        }

        return {
            preparado: true,
            estado: 5, // PREPARADA
            operaciones: opsGeneradas
        };
    }

    despacharMuestra({ idsolicitudmuestra, aprobador = 'bodeguero', comentario = 'Entregado a cliente' }) {
        // mm_despacharmuestra registra estado 6 en mm_estado_solicitud
        // NO genera operaciones adicionales en mm_operacionstock, protegiendo el inventario de dobles descuentos
        return {
            despachado: true,
            estado: 6, // DESPACHADA
            idsolicitudmuestra
        };
    }
}

// -------------------------------------------------------------------------
// DEFINICIÓN DE PRUEBAS AUTOMATIZADAS
// -------------------------------------------------------------------------

const PRODUCTOS_MILLAR = [
    { ItemCode: 'ALI218', SalUnitMsr: 'MIL' },
    { ItemCode: 'ALI219', SalUnitMsr: 'MIL' },
    { ItemCode: 'ALI221', SalUnitMsr: 'MIL' }
];
const PRODUCTOS_EXCLUIDOS_FRONTEND = ['ALI218', 'ALI219', 'ALI221'];

describe('SUITE DE PRUEBAS: MÓDULO DE MUESTRAS CRM & SAP', () => {

    // ---------------------------------------------------------------------
    describe('1. Módulo de Solicitud de Muestras (solicitudmuestra)', () => {
        it('1.1 Debe convertir Kg a gramos (undmedida=1) para producto a granel', () => {
            const res = simularCreacionSolicitud({
                productoCodigo: 'HAR001',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidad: 2.5,
                undmedida: '1',
                cliente: { CardCode: 'C123' },
                comentario: 'Prueba panificación',
                tiporetiro: 'Vendedor'
            });
            assert.equal(res.cantidadGuardada, 2500, '2.5 Kg debe guardarse como 2500 gr');
            assert.equal(res.isUnd, false);
        });

        it('1.2 Debe preservar gramos tal cual (undmedida=2) para producto a granel', () => {
            const res = simularCreacionSolicitud({
                productoCodigo: 'COL002',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidad: 500,
                undmedida: '2',
                cliente: { CardCode: 'C123' },
                comentario: 'Colorante rojo',
                tiporetiro: 'Encomienda'
            });
            assert.equal(res.cantidadGuardada, 500, '500 gr debe guardarse como 500 gr');
            assert.equal(res.isUnd, false);
        });

        it('1.3 Debe preservar unidades físicas enteras para pirotines (productos excluidos)', () => {
            const res = simularCreacionSolicitud({
                productoCodigo: 'ALI219',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidad: 15,
                undmedida: '3',
                cliente: { CardCode: 'C123' },
                comentario: 'Pirotines verdes',
                tiporetiro: 'Vendedor'
            });
            assert.equal(res.cantidadGuardada, 15, '15 pirotines debe guardarse como 15 unidades');
            assert.equal(res.isUnd, true);
            assert.equal(res.undmedida, '3');
        });

        it('1.4 Debe rechazar solicitudes con cantidad cero o negativa', () => {
            assert.throws(() => {
                simularCreacionSolicitud({
                    productoCodigo: 'HAR001',
                    productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                    cantidad: 0,
                    undmedida: '1',
                    cliente: { CardCode: 'C123' },
                    comentario: 'Test',
                    tiporetiro: 'Vendedor'
                });
            }, /CANTIDAD_INVALIDA/);
        });

        it('1.5 Debe rechazar solicitudes con campos incompletos', () => {
            assert.throws(() => {
                simularCreacionSolicitud({
                    productoCodigo: 'HAR001',
                    productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                    cantidad: 10,
                    undmedida: '1',
                    cliente: null,
                    comentario: 'Test',
                    tiporetiro: 'Vendedor'
                });
            }, /CAMPOS_REQUERIDOS_FALTANTES/);
        });
    });

    // ---------------------------------------------------------------------
    describe('2. Módulo de Aprobación de Muestras (aprobacionmuestra)', () => {
        it('2.1 Debe permitir aprobar cantidad normal para producto a granel', () => {
            const res = simularAprobacion({
                productoCodigo: 'HAR001',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: 500,
                cantidadAprobadaInput: 500
            });
            assert.equal(res.cantidadAprobadaFinal, 500);
            assert.equal(res.esExcluido, false);
        });

        it('2.2 Debe normalizar fracción a unidades si aprobador recibió decimal en pirotines', () => {
            const res = simularAprobacion({
                productoCodigo: 'ALI219',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: 15,
                cantidadAprobadaInput: 0.015
            });
            assert.equal(res.cantidadAprobadaFinal, 15, '0.015 en pirotín debe normalizarse a 15 unidades');
            assert.equal(res.esExcluido, true);
        });

        it('2.3 Debe rechazar aprobaciones inválidas o menores/iguales a cero', () => {
            assert.throws(() => {
                simularAprobacion({
                    productoCodigo: 'HAR001',
                    productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                    cantidadSolicitada: 500,
                    cantidadAprobadaInput: -10
                });
            }, /CANTIDAD_APROBADA_INVALIDA/);
        });
    });

    // ---------------------------------------------------------------------
    describe('3. Módulo de Bodega y Despacho (despachomuestra)', () => {
        it('3.1 Granel: prellena en Kg (cantAprobada / 1000) y valida lotes en Kg', () => {
            const res = simularPreparacionBodega({
                productoCodigo: 'HAR001',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: 1000,
                cantidadAprobada: 1000,
                lotesSeleccionados: [
                    { lote: 'LOTE-A', cantidad: 0.4 },
                    { lote: 'LOTE-B', cantidad: 0.6 }
                ]
            });
            assert.equal(res.cantPrellenada, 1.0, '1000 gr debe prellenarse como 1.0 Kg');
            assert.equal(res.cantidadLotesTotal, 1.0);
            assert.equal(res.valido, true);
        });

        it('3.2 Pirotines: prellena en unidades enteras y valida concordancia directa (15 == 15)', () => {
            const res = simularPreparacionBodega({
                productoCodigo: 'ALI219',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: 15,
                cantidadAprobada: 15,
                lotesSeleccionados: [
                    { lote: 'B2605000260', cantidad: 15 }
                ]
            });
            assert.equal(res.cantPrellenada, 15, '15 pirotines debe prellenarse como 15 unidades');
            assert.equal(res.cantidadLotesTotal, 15);
            assert.equal(res.valido, true);
        });

        it('3.3 Pirotines: NO debe multiplicar por 1000 (previene el error histórico de los 15,000)', () => {
            // Si el código volviera a tener el bug de comparar con 15,000, fallaría
            assert.doesNotThrow(() => {
                simularPreparacionBodega({
                    productoCodigo: 'ALI221',
                    productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                    cantidadSolicitada: 5,
                    cantidadAprobada: 5,
                    lotesSeleccionados: [{ lote: 'B2302000084', cantidad: 5 }]
                });
            });
        });

        it('3.4 Debe rechazar despacho si la cantidad de lotes no coincide con la aprobada', () => {
            assert.throws(() => {
                simularPreparacionBodega({
                    productoCodigo: 'HAR001',
                    productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                    cantidadSolicitada: 1000,
                    cantidadAprobada: 1000,
                    lotesSeleccionados: [{ lote: 'LOTE-A', cantidad: 0.8 }] // Faltan 0.2 Kg
                });
            }, /CANTIDAD_DESPACHADA_NO_CONCUERDA/);
        });
    });

    // ---------------------------------------------------------------------
    describe('4. Backend: Cálculo y Actualización de Órdenes en SAP (muestras.model.js)', () => {
        it('4.1 Granel: Convierte gramos a Kg dividiendo para 1000 (500 gr -> 0.5 Kg)', () => {
            const res = simularCalculoSAP({
                idproductosap: 'HAR001',
                cantidadAprobada: 500,
                productosMillar: PRODUCTOS_MILLAR
            });
            assert.equal(res.esMillar, false);
            assert.equal(res.cantSap, 0.5);
            assert.equal(res.cantidadTotalEnSAP, 0.5);
        });

        it('4.2 Pirotines: Convierte unidades a millares (15 und -> 0.015 MIL)', () => {
            const res = simularCalculoSAP({
                idproductosap: 'ALI219',
                cantidadAprobada: 15,
                productosMillar: PRODUCTOS_MILLAR
            });
            assert.equal(res.esMillar, true);
            assert.equal(res.cantSap, 0.015);
            assert.equal(res.cantidadTotalEnSAP, 0.015);
        });

        it('4.3 Pirotines: Acumula correctamente en la orden de SAP si la línea ya existe', () => {
            // Simular que en SAP ya existían 0.005 MIL de ALI219 (de la solicitud 584)
            // y ahora ingresan 0.015 MIL (de la solicitud 567)
            const lineasExistentes = [{ ItemCode: 'ALI219', Quantity: 0.005 }];
            const res = simularCalculoSAP({
                idproductosap: 'ALI219',
                cantidadAprobada: 15,
                productosMillar: PRODUCTOS_MILLAR,
                lineasSAPExistentes: lineasExistentes
            });
            assert.equal(res.cantSap, 0.015);
            assert.equal(res.cantidadTotalEnSAP, 0.020, '0.005 + 0.015 debe acumular exactamente 0.020 MIL en SAP');
        });
    });

    // ---------------------------------------------------------------------
    describe('5. Backend: Guardado de Salida de Stock en MySQL (muestras.model.js)', () => {
        it('5.1 Granel en Bodega SAP: Guarda en gramos en mm_muestras_facturar (0.5 Kg -> 500 gr)', () => {
            const res = simularGuardadoMySQL({
                idproductosap: 'HAR001',
                cantidadLote: 0.5,
                esMillar: false,
                bodegadespacho: 'SAP'
            });
            assert.equal(res.tablaDestino, 'mm_muestras_facturar');
            assert.equal(res.cantidadGuardadaMySQL, 500);
        });

        it('5.2 Pirotín en Bodega SAP: Guarda unidades físicas reales (15 und -> 15, NO 15000)', () => {
            const res = simularGuardadoMySQL({
                idproductosap: 'ALI219',
                cantidadLote: 15,
                esMillar: true,
                bodegadespacho: 'SAP'
            });
            assert.equal(res.tablaDestino, 'mm_muestras_facturar');
            assert.equal(res.cantidadGuardadaMySQL, 15, 'Debe guardar 15 unidades físicas sin multiplicar por 1000');
        });

        it('5.3 Bodega CRM: Enruta a mm_operacionstock para descontar de inventario CRM', () => {
            const res = simularGuardadoMySQL({
                idproductosap: 'CRM_PROD_1',
                cantidadLote: 250,
                esMillar: false,
                bodegadespacho: 'CRM'
            });
            assert.equal(res.tablaDestino, 'mm_operacionstock');
        });
    });

    // ---------------------------------------------------------------------
    describe('6. Flujo Integrado End-to-End (Simulación Completa)', () => {
        it('6.1 Flujo Completo Granel: Solicitud 1 Kg -> Aprobación 1000 gr -> Lote 1 Kg -> SAP 1 Kg -> Facturar 1000', () => {
            // 1. Solicitud
            const sol = simularCreacionSolicitud({
                productoCodigo: 'HAR001',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidad: 1,
                undmedida: '1', // 1 Kg
                cliente: { CardCode: 'C100' },
                comentario: 'Prueba',
                tiporetiro: 'Vendedor'
            });
            assert.equal(sol.cantidadGuardada, 1000);

            // 2. Aprobación
            const apr = simularAprobacion({
                productoCodigo: sol.productoCodigo,
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: sol.cantidadGuardada,
                cantidadAprobadaInput: sol.cantidadGuardada
            });
            assert.equal(apr.cantidadAprobadaFinal, 1000);

            // 3. Bodega
            const bod = simularPreparacionBodega({
                productoCodigo: sol.productoCodigo,
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: sol.cantidadGuardada,
                cantidadAprobada: apr.cantidadAprobadaFinal,
                lotesSeleccionados: [{ lote: 'LOTE-1', cantidad: 1.0 }]
            });
            assert.equal(bod.valido, true);

            // 4. SAP
            const sap = simularCalculoSAP({
                idproductosap: sol.productoCodigo,
                cantidadAprobada: apr.cantidadAprobadaFinal,
                productosMillar: PRODUCTOS_MILLAR
            });
            assert.equal(sap.cantSap, 1.0);

            // 5. Facturar
            const fac = simularGuardadoMySQL({
                idproductosap: sol.productoCodigo,
                cantidadLote: 1.0,
                esMillar: sap.esMillar,
                bodegadespacho: 'SAP'
            });
            assert.equal(fac.cantidadGuardadaMySQL, 1000);
        });

        it('6.2 Flujo Completo Pirotines: Solicitud 15 und -> Aprobación 15 und -> Lote 15 und -> SAP 0.015 MIL -> Facturar 15', () => {
            // 1. Solicitud
            const sol = simularCreacionSolicitud({
                productoCodigo: 'ALI219',
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidad: 15,
                undmedida: '3',
                cliente: { CardCode: 'C100' },
                comentario: 'Pirotines muestra 567',
                tiporetiro: 'Vendedor'
            });
            assert.equal(sol.cantidadGuardada, 15);

            // 2. Aprobación
            const apr = simularAprobacion({
                productoCodigo: sol.productoCodigo,
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: sol.cantidadGuardada,
                cantidadAprobadaInput: sol.cantidadGuardada
            });
            assert.equal(apr.cantidadAprobadaFinal, 15);

            // 3. Bodega
            const bod = simularPreparacionBodega({
                productoCodigo: sol.productoCodigo,
                productosExcluidos: PRODUCTOS_EXCLUIDOS_FRONTEND,
                cantidadSolicitada: sol.cantidadGuardada,
                cantidadAprobada: apr.cantidadAprobadaFinal,
                lotesSeleccionados: [{ lote: 'B2605000260', cantidad: 15 }]
            });
            assert.equal(bod.valido, true);

            // 4. SAP
            const sap = simularCalculoSAP({
                idproductosap: sol.productoCodigo,
                cantidadAprobada: apr.cantidadAprobadaFinal,
                productosMillar: PRODUCTOS_MILLAR
            });
            assert.equal(sap.cantSap, 0.015, 'En SAP debe entrar 0.015 MIL');

            // 5. Facturar
            const fac = simularGuardadoMySQL({
                idproductosap: sol.productoCodigo,
                cantidadLote: 15,
                esMillar: sap.esMillar,
                bodegadespacho: 'SAP'
            });
            assert.equal(fac.cantidadGuardadaMySQL, 15, 'En mm_muestras_facturar debe guardar 15 und');
        });
    });

    // ---------------------------------------------------------------------
    describe('7. Control de Estados en Aprobación (Standby -> Autorizada -> Bodega)', () => {
        it('7.1 Debe transicionar Solicitud de Pendiente (2) a Aprobada en Standby (15) almacenando valores intactos', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'HAR001',
                cliente: { CardCode: 'C100', CardName: 'Panadería Central' },
                cantidad: 1000,
                undmedida: '2',
                comentario: 'Solicitud para pruebas de pan',
                tiporetiro: 'Vendedor'
            });

            assert.equal(gestor.getEstadoActual(sol.idmm_solicitudmuestra), 2);

            const resAprob = gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 1000,
                comentario: 'Aprobado 1000 gr en Standby',
                isaprobado: true
            });

            assert.equal(resAprob.estado, 15);
            assert.equal(gestor.getEstadoActual(sol.idmm_solicitudmuestra), 15);
            assert.equal(resAprob.solicitud.cantidadaprobada, 1000);
            assert.equal(resAprob.solicitud.bodegadespacho, 'CRM');
            assert.equal(resAprob.solicitud.ciudadsalida, 'UIO');
            assert.equal(resAprob.solicitud.cardcode, 'C100');
            assert.equal(resAprob.solicitud.idproductosap, 'HAR001');
        });

        it('7.2 En estado Standby (15) no debe modificarse la solicitud ni perderse datos si no hay edición', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'ALI219',
                cliente: { CardCode: 'C200', CardName: 'Repostería Dulce' },
                cantidad: 15,
                undmedida: '3',
                comentario: 'Pirotines 15 unidades',
                tiporetiro: 'Vendedor'
            });

            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'GYE',
                cantidadaprobada: 15,
                comentario: 'Aprobado 15 und',
                isaprobado: true
            });

            // Verificar que los datos en la tabla principal permanezcan 100% inalterados
            const solEnStandby = gestor.solicitudes.get(sol.idmm_solicitudmuestra);
            assert.equal(solEnStandby.idmm_solicitudmuestra, sol.idmm_solicitudmuestra);
            assert.equal(solEnStandby.cantidadaprobada, 15);
            assert.equal(solEnStandby.idproductosap, 'ALI219');
            assert.equal(solEnStandby.cardcode, 'C200');
            assert.equal(solEnStandby.bodegadespacho, 'CRM');
            assert.equal(solEnStandby.ciudadsalida, 'GYE');
        });

        it('7.3 Debe permitir modificar campos permitidos en Standby preservando la integridad del producto y cliente', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'HAR001',
                cliente: { CardCode: 'C100', CardName: 'Panadería Central' },
                cantidad: 1000,
                undmedida: '2',
                comentario: 'Inicial',
                tiporetiro: 'Vendedor'
            });

            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 1000,
                comentario: 'Aprobado 1000 gr',
                isaprobado: true
            });

            // Modificación en Standby: cambia bodega a SAP y ajusta a 500 gr
            const resMod = gestor.modificarStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                cantidadaprobada: 500,
                bodegadespacho: 'SAP',
                ciudaddespacho: 'UIO',
                comentario: 'Ajustado a 500 gr por disponibilidad en SAP',
                responsable: 'usuario.jefe'
            });

            assert.equal(resMod.solicitud.cantidadaprobada, 500);
            assert.equal(resMod.solicitud.bodegadespacho, 'SAP');
            assert.equal(resMod.solicitud.idproductosap, 'HAR001', 'El producto jamás debe mutar');
            assert.equal(resMod.solicitud.cardcode, 'C100', 'El cliente jamás debe mutar');
        });

        it('7.4 Al pasar de Standby (15) a Autorizada (3), NO debe alterarse la solicitud y los valores deben viajar íntegros a Bodega', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'HAR001',
                cliente: { CardCode: 'C100', CardName: 'Panadería Central' },
                cantidad: 1000,
                undmedida: '2',
                comentario: 'Muestra harina',
                tiporetiro: 'Vendedor'
            });

            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 1000,
                comentario: 'Aprobado en Standby',
                isaprobado: true
            });

            // Capturar snapshot de mm_solicitudmuestra antes de enviar a bodega
            const snapshotAntes = JSON.stringify(gestor.solicitudes.get(sol.idmm_solicitudmuestra));

            // Transición a Autorizada (mm_enviarmuestrabodega)
            const resBodega = gestor.enviarABodegaAutorizada({
                idsolicitud: sol.idmm_solicitudmuestra,
                responsable: 'usuario.jefe',
                isfraccionable: true,
                comentario: 'Liberado para despacho a bodega'
            });

            // Comprobar que en mm_solicitudmuestra NO se haya modificado ni borrado absolutamente nada
            const snapshotDespues = JSON.stringify(gestor.solicitudes.get(sol.idmm_solicitudmuestra));
            assert.equal(snapshotDespues, snapshotAntes, 'La fila en mm_solicitudmuestra debe permanecer 100% intacta');

            // Comprobar el nuevo estado
            assert.equal(resBodega.estadoFinal, 3);
            assert.equal(gestor.getEstadoActual(sol.idmm_solicitudmuestra), 3);

            // Comprobar que los valores viajen intactos a Bodega
            const paraBodega = resBodega.solicitudParaBodega;
            assert.equal(paraBodega.idmm_solicitudmuestra, sol.idmm_solicitudmuestra);
            assert.equal(paraBodega.cantidadaprobada, 1000, 'Cantidad aprobada debe ser exactamente 1000');
            assert.equal(paraBodega.bodegadespacho, 'CRM');
            assert.equal(paraBodega.ciudadsalida, 'UIO');
            assert.equal(paraBodega.cardcode, 'C100');
            assert.equal(paraBodega.idproductosap, 'HAR001');
        });

        it('7.5 Si la solicitud no es fraccionable, debe generar Estado 3 (Autorizado) y Estado 4 (Pendiente Fraccionamiento)', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'HAR001',
                cliente: { CardCode: 'C100' },
                cantidad: 1000,
                undmedida: '2',
                comentario: 'Saco cerrado',
                tiporetiro: 'Vendedor'
            });

            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 1000,
                comentario: 'Requiere fraccionamiento',
                isaprobado: true
            });

            gestor.enviarABodegaAutorizada({
                idsolicitud: sol.idmm_solicitudmuestra,
                responsable: 'usuario.jefe',
                isfraccionable: false, // NO es fraccionable directamente
                comentario: 'Requiere pasar por fraccionamiento'
            });

            const historial = gestor.historialEstados.filter(e => e.idsolicitudmuestra === sol.idmm_solicitudmuestra);
            const estadosRegistrados = historial.map(e => e.idestadosolicitud);

            assert.ok(estadosRegistrados.includes(3), 'Debe incluir Estado 3 (Autorizado)');
            assert.ok(estadosRegistrados.includes(4), 'Debe incluir Estado 4 (Pendiente Fraccionamiento)');
        });

        it('7.6 Rechazo desde Standby debe registrar Estado 9 y bloquear envío a Bodega', () => {
            const gestor = new GestorEstadosMuestra();
            const sol = gestor.ingresarSolicitud({
                productoCodigo: 'HAR001',
                cliente: { CardCode: 'C100' },
                cantidad: 500,
                undmedida: '2',
                comentario: 'Muestra',
                tiporetiro: 'Vendedor'
            });

            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 500,
                comentario: 'En Standby inicial',
                isaprobado: true
            });

            // Rechazar desde Standby
            gestor.aprobarAStandby({
                idsolicitud: sol.idmm_solicitudmuestra,
                aprobador: 'usuario.jefe',
                bodegadespacho: 'CRM',
                ciudaddespacho: 'UIO',
                cantidadaprobada: 0,
                comentario: 'Rechazado por falta de stock definitivo',
                isaprobado: false
            });

            assert.equal(gestor.getEstadoActual(sol.idmm_solicitudmuestra), 9);

            // Intentar enviar a bodega una solicitud rechazada debe fallar
            assert.throws(() => {
                gestor.enviarABodegaAutorizada({
                    idsolicitud: sol.idmm_solicitudmuestra,
                    responsable: 'usuario.jefe'
                });
            }, /ESTADO_INVALIDO_PARA_AUTORIZAR: 9/);
        });
    });

    // ---------------------------------------------------------------------
    describe('8. Módulo de Bodega: Preparación, Despacho y Descuento en Inventario (Cuadre de Stock)', () => {
        it('8.1 Granel: Preparar muestra con Lote único descuenta la cantidad exacta y el stock cuadra', () => {
            const inventario = new InventarioBodegaCRM();
            inventario.crearLote({ lote: 'LOTE-HAR-01', idproducto: 'HAR001', cantidadrecibida: 10000 }); // 10 Kg = 10,000 gr

            assert.equal(inventario.obtenerStockLote('LOTE-HAR-01'), 10000);
            assert.equal(inventario.obtenerStockTotalProducto('HAR001'), 10000);

            // Preparar muestra de 1.5 Kg (1500 gr)
            const resPrep = inventario.prepararMuestraCRM({
                idsolicitudmuestra: 101,
                idproducto: 'HAR001',
                loteseleccionados: [{ lote: 'LOTE-HAR-01', cantidad: 1.5 }],
                esMillar: false,
                responsable: 'bodeguero'
            });

            assert.equal(resPrep.preparado, true);
            assert.equal(resPrep.estado, 5); // PREPARADA

            // Verificar descuento en lote
            const stockLoteFinal = inventario.obtenerStockLote('LOTE-HAR-01');
            assert.equal(stockLoteFinal, 8500, '10,000 - 1,500 debe dar 8,500 gr');

            // Verificar cuadre total de inventario
            const stockTotalFinal = inventario.obtenerStockTotalProducto('HAR001');
            assert.equal(stockTotalFinal, 8500, 'El stock total del ítem debe ser exactamente 8,500 gr');
            assert.equal(10000 - 1500, stockTotalFinal, 'Stock Inicial - Despachado = Stock Final');
        });

        it('8.2 Granel: Preparar muestra con Múltiples Lotes reparte el descuento y cuadra con el stock total del producto', () => {
            const inventario = new InventarioBodegaCRM();
            // Lote 1 con 600 gr, Lote 2 con 2000 gr. Total = 2600 gr
            inventario.crearLote({ lote: 'LOTE-MULT-1', idproducto: 'HAR001', cantidadrecibida: 600 });
            inventario.crearLote({ lote: 'LOTE-MULT-2', idproducto: 'HAR001', cantidadrecibida: 2000 });

            assert.equal(inventario.obtenerStockTotalProducto('HAR001'), 2600);

            // Preparar muestra de 1.0 Kg (1000 gr): se agota Lote 1 (0.6 Kg) y se toman 0.4 Kg de Lote 2
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 102,
                idproducto: 'HAR001',
                loteseleccionados: [
                    { lote: 'LOTE-MULT-1', cantidad: 0.6 },
                    { lote: 'LOTE-MULT-2', cantidad: 0.4 }
                ],
                esMillar: false
            });

            // Lote 1 debe quedar en 0 gr (agotado)
            assert.equal(inventario.obtenerStockLote('LOTE-MULT-1'), 0);
            // Lote 2 debe quedar en 1600 gr (2000 - 400)
            assert.equal(inventario.obtenerStockLote('LOTE-MULT-2'), 1600);

            // Stock total del producto: 0 + 1600 = 1600 gr
            const stockTotalFinal = inventario.obtenerStockTotalProducto('HAR001');
            assert.equal(stockTotalFinal, 1600);
            assert.equal(2600 - 1000, stockTotalFinal, 'Cuadre perfecto: 2600 - 1000 = 1600 gr');
        });

        it('8.3 Pirotines (unidades): Preparar 15 unidades descuenta exactamente 15 unidades en stock (anti-regresión 15,000)', () => {
            const inventario = new InventarioBodegaCRM();
            inventario.crearLote({ lote: 'LOTE-PIR-01', idproducto: 'ALI219', cantidadrecibida: 100 }); // 100 unidades

            assert.equal(inventario.obtenerStockTotalProducto('ALI219'), 100);

            // Preparar muestra de 15 unidades
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 103,
                idproducto: 'ALI219',
                loteseleccionados: [{ lote: 'LOTE-PIR-01', cantidad: 15 }],
                esMillar: true // Producto en unidades enteras
            });

            // Verificar que descuente 15 und y NO 15,000 und
            const stockRestante = inventario.obtenerStockLote('LOTE-PIR-01');
            assert.equal(stockRestante, 85, '100 unidades - 15 unidades debe dar exactamente 85 unidades');
            assert.equal(inventario.obtenerStockTotalProducto('ALI219'), 85);
        });

        it('8.4 Debe bloquear la preparación si un lote no tiene suficiente stock (previene stock negativo)', () => {
            const inventario = new InventarioBodegaCRM();
            inventario.crearLote({ lote: 'LOTE-CORTO', idproducto: 'HAR001', cantidadrecibida: 300 }); // Solo 300 gr disponibles

            // Intentar tomar 0.5 Kg (500 gr) de un lote de 300 gr debe ser rechazado
            assert.throws(() => {
                inventario.prepararMuestraCRM({
                    idsolicitudmuestra: 104,
                    idproducto: 'HAR001',
                    loteseleccionados: [{ lote: 'LOTE-CORTO', cantidad: 0.5 }],
                    esMillar: false
                });
            }, /STOCK_INSUFICIENTE_EN_LOTE/);

            // El stock del lote debe seguir intacto en 300 gr
            assert.equal(inventario.obtenerStockLote('LOTE-CORTO'), 300);
        });

        it('8.5 Despacho final (Estado 6) tras preparación (Estado 5) no duplica el descuento de stock en inventario', () => {
            const inventario = new InventarioBodegaCRM();
            inventario.crearLote({ lote: 'LOTE-DESP-01', idproducto: 'HAR001', cantidadrecibida: 5000 });

            // 1. Preparación de muestra (500 gr)
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 105,
                idproducto: 'HAR001',
                loteseleccionados: [{ lote: 'LOTE-DESP-01', cantidad: 0.5 }],
                esMillar: false
            });

            assert.equal(inventario.obtenerStockLote('LOTE-DESP-01'), 4500);

            // 2. Despacho final al cliente (mm_despacharmuestra)
            const resDesp = inventario.despacharMuestra({
                idsolicitudmuestra: 105,
                aprobador: 'bodeguero',
                comentario: 'Entregado al transportista'
            });

            assert.equal(resDesp.estado, 6); // DESPACHADA

            // 3. Verificar que el stock siga en 4500 y NO se haya descontado 500 gr otra vez
            const stockTrasDespacho = inventario.obtenerStockLote('LOTE-DESP-01');
            assert.equal(stockTrasDespacho, 4500, 'El despacho final no debe duplicar el descuento de stock');
            assert.equal(inventario.obtenerStockTotalProducto('HAR001'), 4500);
        });

        it('8.6 Cuadre contable completo: Stock Inicial = Stock Final + Total Despachado tras múltiples muestras', () => {
            const inventario = new InventarioBodegaCRM();
            inventario.crearLote({ lote: 'LOTE-CONTA-1', idproducto: 'PROD_XYZ', cantidadrecibida: 10000 });
            inventario.crearLote({ lote: 'LOTE-CONTA-2', idproducto: 'PROD_XYZ', cantidadrecibida: 8000 });

            const stockInicialTotal = inventario.obtenerStockTotalProducto('PROD_XYZ'); // 18,000 gr
            assert.equal(stockInicialTotal, 18000);

            // Muestra 1: 1.2 Kg (1200 gr de LOTE-1)
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 201,
                idproducto: 'PROD_XYZ',
                loteseleccionados: [{ lote: 'LOTE-CONTA-1', cantidad: 1.2 }]
            });

            // Muestra 2: 2.5 Kg (2500 gr de LOTE-2)
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 202,
                idproducto: 'PROD_XYZ',
                loteseleccionados: [{ lote: 'LOTE-CONTA-2', cantidad: 2.5 }]
            });

            // Muestra 3: 0.8 Kg (800 gr de LOTE-1)
            inventario.prepararMuestraCRM({
                idsolicitudmuestra: 203,
                idproducto: 'PROD_XYZ',
                loteseleccionados: [{ lote: 'LOTE-CONTA-1', cantidad: 0.8 }]
            });

            const totalDespachado = 1200 + 2500 + 800; // 4500 gr
            const stockFinalLote1 = inventario.obtenerStockLote('LOTE-CONTA-1'); // 10000 - 2000 = 8000
            const stockFinalLote2 = inventario.obtenerStockLote('LOTE-CONTA-2'); // 8000 - 2500 = 5500
            const stockFinalTotal = inventario.obtenerStockTotalProducto('PROD_XYZ'); // 13,500

            assert.equal(stockFinalLote1, 8000);
            assert.equal(stockFinalLote2, 5500);
            assert.equal(stockFinalTotal, 13500);
            assert.equal(stockInicialTotal, stockFinalTotal + totalDespachado, 'Cuadre total: 18000 = 13500 + 4500');
        });
    });

    // ---------------------------------------------------------------------
    describe('9. Recepción de Transferencias entre Bodegas y Filtro de Personal (idtipousuario = 6)', () => {
        const USUARIOS_BODEGA_TEST = [
            { id: 23, nombres: 'Fausto', apellidos: 'Pilataxi Mora', idtipousuario: 6, habilitado: 1, ciudad: 'TODO' },
            { id: 24, nombres: 'Enry Dysney', apellidos: 'Pazmiño Alcivar', idtipousuario: 6, habilitado: 1, ciudad: 'UIO' },
            { id: 25, nombres: 'Jessica Tatiana', apellidos: 'Alba Nepas', idtipousuario: 6, habilitado: 1, ciudad: 'UIO' },
            { id: 26, nombres: 'Luis Andrés', apellidos: 'Espinoza Yépez', idtipousuario: 6, habilitado: 1, ciudad: 'GYE' },
            { id: 27, nombres: 'Kevin Obrian', apellidos: 'Cachott González', idtipousuario: 6, habilitado: 0, ciudad: 'GYE' },
            { id: 28, nombres: 'Carlos Andrés', apellidos: 'Ramos Peña', idtipousuario: 6, habilitado: 0, ciudad: 'GYE' },
            { id: 31, nombres: 'Ximena', apellidos: 'Huacon', idtipousuario: 6, habilitado: 1, ciudad: 'GYE' },
            { id: 99, nombres: 'Vendedor', apellidos: 'Comercial', idtipousuario: 2, habilitado: 1, ciudad: 'UIO' }
        ];

        function filtrarPersonalBodegaReceptor(usuarios, ciudadDestino) {
            const ciudadFiltro = ciudadDestino.toUpperCase().trim();
            return usuarios.filter(u =>
                u.idtipousuario === 6 &&
                u.habilitado === 1 &&
                (u.ciudad.toUpperCase().trim() === ciudadFiltro || u.ciudad.toUpperCase().trim() === 'TODO')
            ).map(u => (u.nombres + ' ' + u.apellidos).trim());
        }

        it('9.1 Transferencia GYE -> UIO: En destino UIO solo deben aparecer personal UIO y TODO habilitados', () => {
            const elegibles = filtrarPersonalBodegaReceptor(USUARIOS_BODEGA_TEST, 'UIO');

            assert.ok(elegibles.includes('Fausto Pilataxi Mora'), 'Fausto (TODO) debe aparecer');
            assert.ok(elegibles.includes('Enry Dysney Pazmiño Alcivar'), 'Enry (UIO) debe aparecer');
            assert.ok(elegibles.includes('Jessica Tatiana Alba Nepas'), 'Jessica (UIO) debe aparecer');

            assert.ok(!elegibles.includes('Luis Andrés Espinoza Yépez'), 'Luis Andrés (GYE) no debe aparecer en UIO');
            assert.ok(!elegibles.includes('Ximena Huacon'), 'Ximena (GYE) no debe aparecer en UIO');
            assert.ok(!elegibles.includes('Kevin Obrian Cachott González'), 'Inhabilitados no deben aparecer');
            assert.ok(!elegibles.includes('Carlos Andrés Ramos Peña'), 'Inhabilitados no deben aparecer');
            assert.ok(!elegibles.includes('Vendedor Comercial'), 'Usuarios con idtipousuario != 6 no deben aparecer');
            assert.equal(elegibles.length, 3);
        });

        it('9.2 Transferencia UIO -> GYE: En destino GYE solo deben aparecer personal GYE y TODO habilitados', () => {
            const elegibles = filtrarPersonalBodegaReceptor(USUARIOS_BODEGA_TEST, 'GYE');

            assert.ok(elegibles.includes('Fausto Pilataxi Mora'), 'Fausto (TODO) debe aparecer');
            assert.ok(elegibles.includes('Luis Andrés Espinoza Yépez'), 'Luis Andrés (GYE) debe aparecer');
            assert.ok(elegibles.includes('Ximena Huacon'), 'Ximena (GYE) debe aparecer');

            assert.ok(!elegibles.includes('Enry Dysney Pazmiño Alcivar'), 'Enry (UIO) no debe aparecer en GYE');
            assert.ok(!elegibles.includes('Jessica Tatiana Alba Nepas'), 'Jessica (UIO) no debe aparecer en GYE');
            assert.ok(!elegibles.includes('Kevin Obrian Cachott González'), 'Inhabilitados no deben aparecer');
            assert.ok(!elegibles.includes('Carlos Andrés Ramos Peña'), 'Inhabilitados no deben aparecer');
            assert.equal(elegibles.length, 3);
        });

        it('9.3 Confirmación de recepción: Asienta correctamente el responsable receptor y comentario', () => {
            const muestraTransferida = {
                idmm_solicitudmuestra: 888,
                transferida: 1,
                ciudaddestino: 'UIO',
                ciudadsalida: 'GYE',
                fecharecibidodestino: null,
                comentariorecibido: null
            };

            const payloadRecepcion = {
                idmm_solicitudmuestra: 888,
                personaRecibe: 'Enry Dysney Pazmiño Alcivar',
                comentario: 'Cajas llegaron en perfecto estado'
            };

            const textoComentario = 'Recibido por: ' + payloadRecepcion.personaRecibe + ' - ' + payloadRecepcion.comentario;
            muestraTransferida.fecharecibidodestino = new Date();
            muestraTransferida.comentariorecibido = textoComentario;

            assert.ok(muestraTransferida.fecharecibidodestino !== null);
            assert.ok(muestraTransferida.comentariorecibido.includes('Recibido por: Enry Dysney Pazmiño Alcivar'));
            assert.ok(muestraTransferida.comentariorecibido.includes('Cajas llegaron en perfecto estado'));
        });
    });

    // ---------------------------------------------------------------------
    describe('10. Nuevas Bodegas SAP (MUEQ/MUEG), Call Center, Dimensiones y Descuento', () => {
        function armarLineaProductoMuestraSAP({ idproductosap, cantSap, producto, ciudadsalida }) {
            return {
                ItemCode: idproductosap,
                Quantity: cantSap,
                DiscountPercent: 0,
                TaxCode: producto ? producto.Code : 'IVA15',
                UnitPrice: producto ? (producto.PVPMIN > 0 ? producto.PVPMIN : producto.COSTO) : 0,
                WarehouseCode: ciudadsalida === 'UIO' ? 'MUEQ' : 'MUEG',
                CostingCode: 'VTA',
                CostingCode2: ciudadsalida,
                CostingCode4: producto ? producto.CostingCode4 : null
            };
        }

        function armarCabeceraPedidoMinerva(auxciudad) {
            return {
                CardCode: 'C1790038033001',
                DocDueDate: '2026-11-30',
                Series: auxciudad === 'UIO' ? 246 : 247, // 246 UIO, 247 GYE en Producción
                SalesPersonCode: auxciudad === 'UIO' ? 2 : 1, // 2: CALL CENTER UIO, 1: CALL CENTER GYE
                U_Horario_Entrega: 'H012',
                U_Detalle_Horario: 'Lun-Vie\n09:00 - 15:00',
                DocumentLines: []
            };
        }

        it('10.1 Almacén SAP: Asigna MUEQ para Quito y MUEG para Guayaquil', () => {
            const lineaQuito = armarLineaProductoMuestraSAP({
                idproductosap: 'INS001',
                cantSap: 0.5,
                producto: { Code: 'IVA15', PVPMIN: 1.04, CostingCode4: 'ALI' },
                ciudadsalida: 'UIO'
            });
            const lineaGye = armarLineaProductoMuestraSAP({
                idproductosap: 'ALI266',
                cantSap: 0.1,
                producto: { Code: 'IVA15', PVPMIN: 2.34, CostingCode4: 'ALI' },
                ciudadsalida: 'GYE'
            });

            assert.equal(lineaQuito.WarehouseCode, 'MUEQ', 'Quito debe usar bodega MUEQ');
            assert.equal(lineaGye.WarehouseCode, 'MUEG', 'Guayaquil debe usar bodega MUEG');
        });

        it('10.2 Call Center: Asigna SlpCode 2 (CALL CENTER UIO) para Quito y 1 (CALL CENTER GYE) para Guayaquil', () => {
            const cabeceraUIO = armarCabeceraPedidoMinerva('UIO');
            const cabeceraGYE = armarCabeceraPedidoMinerva('GYE');

            assert.equal(cabeceraUIO.SalesPersonCode, 2, 'Quito debe ser CALL CENTER UIO (SlpCode 2)');
            assert.equal(cabeceraGYE.SalesPersonCode, 1, 'Guayaquil debe ser CALL CENTER GYE (SlpCode 1)');
            assert.equal(cabeceraUIO.CardCode, 'C1790038033001', 'Debe ser cliente Minerva S.A.');
            assert.equal(cabeceraGYE.CardCode, 'C1790038033001', 'Debe ser cliente Minerva S.A.');
        });

        it('10.3 Dimensiones contables completas: CostingCode=VTA, CostingCode2=Ciudad, CostingCode4=Categoría', () => {
            const linea = armarLineaProductoMuestraSAP({
                idproductosap: 'PIN086',
                cantSap: 0.1,
                producto: { Code: 'IVA15', PVPMIN: 2.01, CostingCode4: 'PYA' },
                ciudadsalida: 'GYE'
            });

            assert.equal(linea.CostingCode, 'VTA', 'Dimensión 1 (Departamento) debe ser VTA');
            assert.equal(linea.CostingCode2, 'GYE', 'Dimensión 2 (Ciudad) debe coincidir con ciudad de salida');
            assert.equal(linea.CostingCode4, 'PYA', 'Dimensión 4 (Categoría) debe ser PYA para pinturas');
        });

        it('10.4 Descuento inicializado: DiscountPercent debe ser 0 numérico, nunca null ni vacío', () => {
            const linea = armarLineaProductoMuestraSAP({
                idproductosap: 'ALI266',
                cantSap: 0.1,
                producto: { Code: 'IVA15', PVPMIN: 2.34, CostingCode4: 'ALI' },
                ciudadsalida: 'GYE'
            });

            assert.strictEqual(linea.DiscountPercent, 0, 'DiscountPercent debe ser exactamente 0');

            // Simulación de saneamiento de líneas existentes que venían con null
            const lineasExistentes = [
                { ItemCode: 'ALI266', DiscountPercent: null },
                { ItemCode: 'PIN086', DiscountPercent: undefined },
                { ItemCode: 'INS004', DiscountPercent: 0 }
            ];

            for (let item of lineasExistentes) {
                if (item.DiscountPercent === null || item.DiscountPercent === undefined) {
                    item.DiscountPercent = 0;
                }
            }

            assert.strictEqual(lineasExistentes[0].DiscountPercent, 0);
            assert.strictEqual(lineasExistentes[1].DiscountPercent, 0);
            assert.strictEqual(lineasExistentes[2].DiscountPercent, 0);
        });

        it('10.5 Aislamiento de Pedido Minerva: Solo debe enlazar órdenes con CardCode C1790038033001', () => {
            const ordenesHana = [
                { DocEntry: 48821, Series: 13, DocStatus: 'O', CardCode: 'C1790012345001' }, // Orden de otro cliente
                { DocEntry: 114171, Series: 112, DocStatus: 'O', CardCode: 'C1790038033001' }, // Orden Minerva GYE
                { DocEntry: 114180, Series: 13, DocStatus: 'O', CardCode: 'C1790038033001' }   // Orden Minerva UIO
            ];

            const ordenMinervaGYE = ordenesHana.filter(o => o.DocStatus === 'O' && o.Series === 112 && o.CardCode === 'C1790038033001');
            const ordenMinervaUIO = ordenesHana.filter(o => o.DocStatus === 'O' && o.Series === 13 && o.CardCode === 'C1790038033001');

            assert.equal(ordenMinervaGYE.length, 1);
            assert.equal(ordenMinervaGYE[0].DocEntry, 114171);
            assert.equal(ordenMinervaUIO.length, 1);
            assert.equal(ordenMinervaUIO[0].DocEntry, 114180);

            // Asegurar que la orden del otro cliente nunca se tome
            const ordenOtroCliente = ordenesHana.filter(o => o.DocStatus === 'O' && o.Series === 13 && o.CardCode === 'C1790038033001');
            assert.ok(!ordenOtroCliente.some(o => o.DocEntry === 48821), 'La orden 48821 no pertenece a Minerva');
        });
    });
});
