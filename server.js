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
        const todayDate = new Date();
        const today = todayDate.getFullYear() + '-' + (todayDate.getMonth() + 1) + '-' + todayDate.getDate() + ' 7:00';
        const endDate = new Date(todayDate);
        endDate.setDate(endDate.getDate() + 7);
        const end = endDate.getFullYear() + '-' + (endDate.getMonth() + 1) + '-' + endDate.getDate() + ' 20:00';
    

        // Query to the database and get the records
        request.query(`SELECT * from vw_ODBC_appts_Appointments A WHERE A.StartDateTime > '${today}' AND A.StartDateTime <= '${end}' AND A.ColumnHeadingFID = 15 AND A.ApptStatus = 0`,
            (err, records) => {
                if (err) console.log(err)
                // Send records as a response
                // to browser
                let recordset = records.recordset;
                authorize()
                .then((auth) => {
                    //createEvents(auth, recordset);
                    console.log('recordset: done');
                }).catch(console.error);
            });
    }
});


app.get('/', (req, res) => {
    
    
});


//app.listen(port, () => console.log(`Listening on port ${port}`));
