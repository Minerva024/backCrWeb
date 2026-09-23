const db = require('./config/configMySQL');

db.query("CALL mm_obtenerstockxlotexciudad('171','UIO')", (err, res) => {
    if (err) console.error('Error:', err);
    else console.log('Result for product 171 UIO:', res[0]);
    
    db.query("CALL mm_obtenerstockxlotexciudad('101','UIO')", (err2, res2) => {
        if (err2) console.error('Error 2:', err2);
        else console.log('Result for product 101 UIO:', res2[0]);
        db.end();
    });
});

