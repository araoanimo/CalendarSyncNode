const express = require('express');
const sql = require('mssql');
const {authorize, createEvents, deleteEvents} = require('./calendarAPI.js');
require('dotenv').config();



const app = express();
const port = 3002;

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true, // change to true for local dev / self-signed certs
        hostNameInCertificate: true
    }
};
sql.connect(config, err => {
    if (err) {
        console.log(err);
    } else {
    console.log('Connected to database');
    var request = new sql.Request();
 
        // Query to the database and get the records
        request.query(`SELECT * from vw_ODBC_appts_Appointments A WHERE A.StartDateTime > '2023-3-18 12:00' AND A.StartDateTime <= '2023-3-20 20:00' AND A.ColumnHeadingFID = 15 AND A.ApptStatus = 0`,
            (err, records) => {
                if (err) console.log(err)
                // Send records as a response
                // to browser
                let recordset = records.recordset;
                authorize()
                .then((auth) => {
                    createEvents(auth, recordset);
                }).catch(console.error);
            });
    }
});


app.get('/', (req, res) => {
    
    
});


//app.listen(port, () => console.log(`Listening on port ${port}`));
