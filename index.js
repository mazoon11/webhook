const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());


const serviceAccount = JSON.parse(process.env.firebase_service_account);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://final-medi-home-48142-default-rtdb.firebaseio.com' 
});
const db = admin.database();


app.get('/', (req, res) => {
    res.send('Webhook is running!');
});


app.get('/api/search-doctor', async (req, res) => {
    try {
        const doctorName = req.query.name; 

        if (!doctorName) {
            return res.status(400).json({ error: 'Please provide a doctor name to search.' });
        }

        console.log(`Searching for doctor: ${doctorName}`);

        const snapshot = await db.ref('/doctors').once('value');
        console.log('Fetched doctors data:', snapshot.val()); 

        let foundDoctor = null;

        snapshot.forEach(childSnapshot => {
            const doctor = childSnapshot.val();
            if (doctor.name.toLowerCase() === doctorName.toLowerCase()) {
                foundDoctor = doctor;
            }
        });

        if (foundDoctor) {
            console.log(`Doctor found: ${foundDoctor.name}, Specialty: ${foundDoctor.TherapySpecialty}, Wilaya: ${foundDoctor.wilaya}, Price: ${foundDoctor.price}`); 

            res.json({
                doctor: foundDoctor,
                message: `Doctor ${foundDoctor.name} found! Specialty: ${foundDoctor.TherapySpecialty}, Wilaya: ${foundDoctor.wilaya}, Price: ${foundDoctor.price} OMR.`
            });
        } else {
            console.log(`No doctor found with the name ${doctorName}.`);
            res.status(404).json({ error: `No doctor found with the name ${doctorName}.` });
        }
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ error: 'An error occurred while searching for the doctor.' });
    }
});


app.post('/webhook', async (req, res) => {
    try {
        console.log('Received request from Dialogflow:', req.body);
        const intent = req.body.queryResult.intent.displayName;
        const parameters = req.body.queryResult.parameters;

        console.log('Extracted parameters:', parameters); 

        if (intent === 'Search Doctor') {
            let doctorName = parameters['doctor-name'];

            if (Array.isArray(doctorName) && doctorName.length > 0) {
                doctorName = doctorName[0].name; 
            }

            console.log('Extracted doctorName:', doctorName); 

          
            if (!doctorName) {
                console.log('Doctor name not provided, returning response.');
                return res.json({
                    fulfillmentText: 'Please provide a doctor name to search.'
                });
            }

            // البحث عن الطبيب في Firebase
            const snapshot = await db.ref('/doctors').once('value');
            console.log('Fetched doctors data:', snapshot.val()); 

            let foundDoctor = null;

            snapshot.forEach(childSnapshot => {
                const doctor = childSnapshot.val();
                if (doctor.name.toLowerCase() === doctorName.toLowerCase()) {
                    foundDoctor = doctor;
                }
            });

            if (foundDoctor) {
                console.log(`Doctor found: ${foundDoctor.name}, Specialty: ${foundDoctor.TherapySpecialty}, Wilaya: ${foundDoctor.wilaya}, Price: ${foundDoctor.price}`); 

                res.json({
                    fulfillmentText: `Doctor ${foundDoctor.name} found! Specialty: ${foundDoctor.TherapySpecialty}, Wilaya: ${foundDoctor.wilaya}, Price: ${foundDoctor.price} OMR.`
                });
            } else {
                console.log(`No doctor found with the name ${doctorName}.`);
                res.json({
                    fulfillmentText: `Sorry, no doctor found with the name ${doctorName}.`
                });
            }
        } else {
            console.log(`Unknown intent: ${intent}`);
            res.json({
                fulfillmentText: 'Sorry, I did not understand your request.'
            });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.json({
            fulfillmentText: 'An error occurred while processing your request.'
        });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook running on port ${PORT}`);
});