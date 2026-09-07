const admin = require('firebase-admin');
const serviceAccount = require('./crmovil-e9313-firebase-adminsdk-67z7z-6374f381c5.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

exports.enviarnotificacion = async function enviarNotificacion(token, titulo, mensajebody) {
  const message = {
    //token: 'fI-JilIlTLGhzSJcRhiChB:APA91bHZ3vEeiBfE_r_GEh_3BLipEuWefj44igbXxpavIpK7Je41dRHDLvvh-YXppc8KfGVfZyl84EwYknn8UQ2f1RdOPcMTHyzkpJXHbx4sGc4TjyLo0vs', // ← dispositivo específico
    token: token,
    notification: {
      title: titulo,
      body: mensajebody
    },
    data: {
      idSolicitud: '123'
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificación enviada:', response);
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
}