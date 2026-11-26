const { default: axios } = require("axios");

var urlbase = 'https://192.168.40.19:50000/b1s/v1/';

exports.activarservicelayer = async function () {
  let cookie = [];
  await axios.post(urlbase + "Login", {
//Base SAP de Pruebas
    "CompanyDB": "EC_SBO_MINERVA_PRO",
//Base SAP de Produccion
  //"CompanyDB": "EC_SBO_MINERVA_PRO",
  //"CompanyDB": "PRUEBAS_CRM",
  //usuario que accede a SAP
    "UserName": "manager ",
    "Password": "M1n3r23v4"
  }, { withCredentials: true }).then(function (response) {
    cookie = response.headers['set-cookie'];
  })
    .catch(function (error) {
      console.log(error);
    });
  return (cookie);
}