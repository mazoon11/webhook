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
        const specialty = req.query.specialty;
        const wilaya = req.query.wilaya;

        const query = {}; 

        if (doctorName) query.name = doctorName.toLowerCase();
        if (specialty) query.TherapySpecialty = specialty.toLowerCase();
        if (wilaya) query.wilaya = wilaya.toLowerCase();

        console.log(`Searching for:`, query); 

        const snapshot = await db.ref('/doctors').once('value');
        const filteredDoctors = [];
		const nameKeywords = doctorName ? doctorName.toLowerCase().split(/\s+/) : [];
		const specialtyKeywords = specialty ? specialty.toLowerCase().split(/\s+/) : [];
		const wilayaKeywords = wilaya ? wilaya.toLowerCase().split(/\s+/) : [];
        snapshot.forEach(childSnapshot => {
            const doctor = childSnapshot.val();
            const doctorNameLC = doctor.name.toLowerCase();
    const specialtyLC = doctor.TherapySpecialty.toLowerCase();
    const wilayaLC = doctor.wilaya.toLowerCase();

    const matchesName = nameKeywords.length === 0 || nameKeywords.some(kw => doctorNameLC.includes(kw));
    const matchesSpecialty = specialtyKeywords.length === 0 || specialtyKeywords.some(kw => specialtyLC.includes(kw));
    const matchesWilaya = wilayaKeywords.length === 0 || wilayaKeywords.some(kw => wilayaLC.includes(kw));

    if (matchesName && matchesSpecialty && matchesWilaya) {
        filteredDoctors.push(doctor);
    }
        });

        if (filteredDoctors.length > 0) {
            console.log(`Found ${filteredDoctors.length} doctors matching criteria.`);
            res.json({ doctors: filteredDoctors });
        } else {
            console.log(`No doctors found.`);
            res.status(404).json({ error: 'No doctors found with the given criteria.' });
        }
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ error: 'An error occurred while searching for doctors.' });
    }
});


app.post('/webhook', async (req, res) => {
    try {
        console.log('Received request from Dialogflow:', req.body); 
        const intent = req.body.queryResult.intent.displayName;
        const parameters = req.body.queryResult.parameters;

        console.log('Extracted parameters:', parameters); 

        if (intent === 'Search Doctor') {
            const doctorName = parameters['doctor-name'];
            const specialty = parameters['specialty'];
            const wilaya = parameters['wilaya'];

            const query = {};
            if (doctorName) query.name = doctorName.toLowerCase();
            if (specialty) query.TherapySpecialty = specialty.toLowerCase();
            if (wilaya) query.wilaya = wilaya.toLowerCase();

            const snapshot = await db.ref('/doctors').once('value');
            const filteredDoctors = [];

            snapshot.forEach(childSnapshot => {
                const doctor = childSnapshot.val();
                const matchesName = !doctorName || doctor.name.toLowerCase() === doctorName;
                const matchesSpecialty = !specialty || doctor.TherapySpecialty.toLowerCase() === specialty;
                const matchesWilaya = !wilaya || doctor.wilaya.toLowerCase() === wilaya;

                if (matchesName && matchesSpecialty && matchesWilaya) {
                    filteredDoctors.push(doctor);
                }
            });

            if (filteredDoctors.length > 0) {
                const responseText = `Found ${filteredDoctors.length} doctors matching criteria.`;
                res.json({ fulfillmentText: responseText });
            } else {
                res.json({ fulfillmentText: 'No doctors found with the given criteria.' });
            }
        } else {
            console.log(`Unknown intent: ${intent}`);
            res.json({ fulfillmentText: 'Sorry, I did not understand your request.' });
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