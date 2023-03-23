const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {columnIdsMap} =  require('./columnIds.js');
const {backOff} = require('exponential-backoff');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'CalendarSyncCredentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}


const sleep = ms => new Promise(res => setTimeout(res, ms))



/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
 async function createEvents(auth, recordset) {
  const calendar = google.calendar({version: 'v3', auth});
  const events  = extractFromRecordSet(recordset);
  for(let i = 0; i < events.length; i++){    
    console.log(events[i].end);
    createOneEvent(auth, events[i], calendar);
    await sleep(3000);
  } 
}

  async function deleteEvents(auth, recordset) {
    const calendar = google.calendar({version: 'v3', auth});
    const events  = extractFromRecordSet(recordset);
    for(let i = 0; i < events.length; i++){    
      console.log(events[i].id);
      deleteOneEvent(auth, events[i].id, calendar);
      await sleep(3000);
    } 
  }


  const createOneEvent = (auth, event, calendar) => {
    calendar.events.insert({
      auth: auth,
      calendarId: 'primary',
      resource: event,
      //sendNotifications: true,
    }, function(err) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return;
      }
      console.log(`Event created ${event.summary}`);
      console.log(`Attendees: ${event.attendees[0].email}`)
    })  
  }

  const deleteOneEvent = (auth, eventId, calendar) => {
    calendar.events.delete({
      auth: auth,
      calendarId: 'primary',
      eventId: eventId,
    }, function(err) {
      if (err) {
        console.log('There was an error contacting the Calendar service: ' + err);
        return;
      }
      console.log(`Event deleted ${eventId}`);
    })
  }

  

  const extractFromRecordSet = (recordset) => {
    const events = [];
    for(let record in recordset){
      const columnId = recordset[record]['ColumnHeadingFID'];
      const eventId = recordset[record]['Appointment_UID'];
      const provEmail = columnIdsMap[columnId][0];
      console.log(provEmail);
      const provName = columnIdsMap[columnId][1];
      console.log(provName);
      const startTimeDate = new Date(recordset[record]['StartDateTime']);
      startTimeDate.setTime(startTimeDate.getTime() + startTimeDate.getTimezoneOffset()*60*1000);
      const duration = recordset[record]['Duration'];
      const endTimeDate = new Date(startTimeDate);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + duration);
      const startTimeDateISO = startTimeDate.toISOString();
      const endTimeDateISO = endTimeDate.toISOString();
      const event = populateEvent(provName, provEmail, eventId, startTimeDateISO, endTimeDateISO);
      events.push(event);
    }
    return events;
  }


    const populateEvent = (provName, provEmail, eventId, startTime, endTime) => {
      const event = {
        'summary': 'Patient Appointment',
        'location': 'Remote',
        'description': `${provName} Patient Appointment`,
        'start': {
          'dateTime': `${startTime}`,
          'timeZone': 'America/New_York',
        },
        'end': {
          'dateTime': `${endTime}`,
          'timeZone': 'America/New_York',
        },
        'recurrence': [
          
        ],
        'attendees': [
           //{'email': `${provEmail}`}
          {'email': `arao@animosanopsychiatry.com`}
        ],
        'id': `${eventId}`,
        'sendUpdates': 'none', //all, externalOnly, none
        
        'reminders': {
          'useDefault': false,
          'overrides': [
            {'method': 'email', 'minutes': 24 * 60},
            {'method': 'popup', 'minutes': 10},
          ],
        },
      };
      return event;
    }

module.exports = {authorize, createEvents, deleteEvents};
