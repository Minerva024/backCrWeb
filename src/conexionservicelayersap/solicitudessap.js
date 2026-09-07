
const { activarservicelayer } = require("./validarusuariosap");
const { default: axios } = require("axios");
let cookiesap = '';
var urlbase = 'https://192.168.40.19:50000/b1s/v1/';

exports.ingresarofertadeventa = async function (ofertaventa, result) {
     //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
     if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    console.log(cookiesap);
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.post(urlbase + "Quotations", ofertaventa, config);
       // console.log(response);
	//colocada por RM
	console.log("[SAP] Ingreso exitoso. Status:", response.status);
	//Fin de la linea RM
        return response.status == 201;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.post(urlbase + "Quotations", ofertaventa, retryConfig);
               // console.log(response);
		// Ageragdo por RM
		console.log("[SAP] Reintento exitoso. Status:", retryResponse.status);
		//Fin de l�nea RM
                return retryResponse.status === 201;
            } catch (retryError) {
               // console.error("Error al reintentar obtener cliente:", retryError.message);
//Agregado por RM
//console.error("[SAP][OFERTA][REINTENTO]", {
    //status: retryError.response?.status,
    //url: retryError.config?.url,
    //data: retryError.response?.data,
    //mensaje: retryError.message
//});

console.error(
    "[SAP][OFERTA][REINTENTO]",
    JSON.stringify(
        {
            status: retryError.response?.status,
            url: retryError.config?.url,
            data: retryError.response?.data,
            mensaje: retryError.message
        },
        null,
        2
    )
);



// Fin de agregar RM
                return false;
            }
        } else {
         //console.error("Error general al obtener cliente:", error.message);
//Agregado por RM
//console.error("[SAP][OFERTA]", {
    //status: error.response?.status,
    //url: error.config?.url,
    //data: error.response?.data,
    //mensaje: error.message
//});

console.error(
    "[SAP][OFERTA]",
    JSON.stringify(
        {
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
            mensaje: error.message
        },
        null,
        2
    )
);

// Fin de agregar RM

            return false;
        }
    }

    /*if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }

    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        await axios.post(urlbase + "Quotations", ofertaventa, { headers: { Cookie: cookiesap }, withCredentials: true })
            .then(function (response) {
                console.log(response);

                if (response['status'] == 201) {
                    auxingresado = true;
                } else {
                    auxingresado = false
                }
            })
            .catch(function (error) {
                console.log("Hola Error");
            });
        return (auxingresado);
    } else {
        await axios.post(urlbase + "Quotations", ofertaventa, { headers: { Cookie: cookiesap }, withCredentials: true })
            .then(function (response) {
                if (response['status'] == 201) {
                    auxingresado = true;
                } else {
                    auxingresado = false
                }
            })
            .catch(function (error) {
                console.log(error.data);
            });
        if (inautorizado == true) {
            cookiesap = await activarservicelayer();
            await axios.post(urlbase + "Quotations", ofertaventa, { headers: { Cookie: cookiesap }, withCredentials: true })
                .then(function (response) {
                    if (response['status'] == 201) {
                        auxingresado = true;
                    } else {
                        auxingresado = false
                    }
                })
                .catch(function (error) {
                    console.log(error.data['error']);
                });
        }
        console.log("****************************************");
        return (auxingresado);
    }*/
}
exports.registrarcliente = async function (auxcliente, result) {
    let auxingresado = false;
    console.log(auxcliente);
    
    //cookiesap= '';
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.post(urlbase + "BusinessPartners", auxcliente, config);
        return response.status === 201;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.post(urlbase + "BusinessPartners", auxcliente, retryConfig);
                return retryResponse.status === 201;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.response.data);
                return false;
            }
        } else {
            console.error("Error general al obtener cliente:", error.response.data);
            return false;
        }
    }


    /*if (cookiesap == '') {
        cookiesap = await activarservicelayer();
        await axios.post(urlbase + "BusinessPartners", auxcliente, { headers: { Cookie: cookiesap }, withCredentials: true })
            .then(function (response) {
                //console.log(response);

                if (response['status'] == 201) {
                    auxingresado = true;
                } else {
                    auxingresado = false
                }
            })
            .catch(function (error) {
                console.log(error.data);
                
                console.log(error.response.data);
            });
        return (auxingresado);
    }else{
        cookiesap = await activarservicelayer();
        await axios.post(urlbase + "BusinessPartners", auxcliente,{ headers: { Cookie: cookiesap }, withCredentials: true})
            .then(function (response) { 
                //console.log(response);
                               
                if (response['status'] == 201) {
                    auxingresado = true;
                } else {
                    auxingresado = false
                }
            })
            .catch(function (error) {
                console.log(error);

            });
        return (auxingresado);
    }*/
}
exports.actualizarclientedocumentacion = async function (auxcliente, result) {
    let auxingresado = false;
    let body = {};
    if (auxcliente["formulariocreacioncliente"]) {
        body.Properties13 = 'Y';
    }
    if (auxcliente["cedula"]) {
        body.Properties14 = 'Y';
    }
    if (auxcliente["ruc"]) {
        body.Properties15 = 'Y';
    }
    if (auxcliente["nombramiento"]) {
        body.Properties16 = 'Y';
    }
    if (auxcliente["otros"]) {
        body.Properties17 = 'Y';
    }
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    console.log(cookiesap);
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.patch(urlbase + "BusinessPartners('" + auxcliente.CardCode + "')", body, config);
        return response.status === 201;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.patch(urlbase + "BusinessPartners('" + auxcliente.CardCode + "')", body, retryConfig);
                return retryResponse.status === 201;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.message);
                return false;
            }
        } else {
            console.error("Error general al obtener cliente:", error.message.data);
            return false;
        }
    }
}
exports.obtenerclientesap = async function (auxcardcode, params) {
    let auxingresado = {};
    let inautorizado = false;
    //console.log(auxcardcode);
    cookiesap= '';
    if(!cookiesap){
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.get(urlbase + "BusinessPartners('" + auxcardcode + "')", config);
        return response.data;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.get(urlbase + "BusinessPartners('" + auxcardcode + "')", retryConfig);
                return retryResponse;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.message);
                return null;
            }
        } else {
            console.error("Error general al obtener cliente:", error.message);
            return null;
        }
    }
}
//Funcion para realizar la actualización de un cliente o un lead.
exports.actualizarcliente = async function (auxcliente, result) {
    let auxingresado = false;
    console.log(auxcliente);
    //cookiesap= '';
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.patch(urlbase + "BusinessPartners('"+auxcliente.CardCode+"')", auxcliente, config);
        console.log(response);
        
        return response.status === 204;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.patch(urlbase + "BusinessPartners('"+auxcliente.CardCode+"')", auxcliente, retryConfig);
                return retryResponse.status === 204;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.response.data);
                return false;
            }
        } else {
            console.error("Error general al obtener cliente:", error.response.data);
            return false;
        }
    }
}

//Funcion para obtener la orden de compra para la muestra
exports.obtenerordendecompra = async function (auxiddocumento, result) {
    //cookiesap= '';
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.get(urlbase + "Orders("+auxiddocumento+")", config);
        //console.log(response);
        
        return response.data;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.get(urlbase + "Orders('"+auxiddocumento+"')", config);
                return retryResponse.data;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.response.data);
                return false;
            }
        } else {
            console.error("Error general al obtener id de la orden :", error.response.data);
            return false;
        }
    }
}
//Funcion para ingresar la orden de compra para la muestra
exports.ingresarordendecompra = async function (auxorden, result) {
    //cookiesap= '';
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.post(urlbase + "Orders",auxorden, config);
        console.log(response);
        
        return response.status;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.post(urlbase + "Orders",auxorden, config);
                return retryResponse.status;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.response.data);
                return false;
            }
        } else {
            console.error("Error general al obtener cliente:", error.response.data);
            return false;
        }
    }
}
//Funcion para actualizar la orden de compra para la muestra
exports.actualizarordendecompra = async function (auxiddocumento,auxorden, result) {
    //cookiesap= '';
    console.log("Datos que llegan al servicio");
    console.log(auxorden);
    
    
    //Compruebo si el cookie esta vacio o es nulo, para obtener la cookie desde el service layer.
    if (!cookiesap) {
        cookiesap = await activarservicelayer();
        if (!cookiesap) return null;
    }
    //Realizo la configuración del header de la solitud a SAP B1.
    const config = {
        headers: { Cookie: cookiesap.join('; ') },
        withCredentials: true,
    }
    //Realizo la petición con un try y catch.
    try {
        const response = await axios.patch(urlbase + "Orders("+auxiddocumento+")",{"DocumentLines":auxorden.DocumentLines}, config);
        //console.log(response);
        
        return response.status;
    } catch (error) {
        // Si la sesión está expirada, intentamos renovar la cookie
        if (error.response && error.response.status === 401) {
            console.warn("Sesión caducada. Reintentando login...");
            cookiesap = await activarservicelayer();

            if (!cookiesap) return null;

            const retryConfig = {
                headers: { Cookie: cookiesap.join('; ') },
                withCredentials: true,
            };
            //Realizo la solicitud al Service Layer de SAP nuevamente con la nueva cookie.
            try {
                const retryResponse = await axios.patch(urlbase + "Orders('"+auxiddocumento+"')",auxorden, config);
                return retryResponse.status;
            } catch (retryError) {
                console.error("Error al reintentar obtener cliente:", retryError.response.data);
                return false;
            }
        } else {
            console.error("Error general al obtener cliente:", error.response.data);
            return false;
        }
    }
}