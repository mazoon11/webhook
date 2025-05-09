const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
app.use(bodyParser.json());

// Load Firebase service account from environment
const serviceAccount = JSON.parse(process.env.firebase_service_account);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com'
});
const db = admin.database();

app.post('/webhook', async (req, res) => {
    const intent = req.body.queryResult.intent.displayName;
    const parameters = req.body.queryResult.parameters;

    if (intent === 'Search Doctor') {
        const doctorName = parameters['doctor_name'];

        try {
            const snapshot = await db.ref('/doctors').orderByChild('name').equalTo(doctorName).once('value');

            if (snapshot.exists()) {
                const doctorData = snapshot.val();
                const doctorId = Object.keys(doctorData)[0];
                const doctor = doctorData[doctorId];

                res.json({
                    fulfillmentText: `Doctor ${doctor.name} found! Specialty: ${doctor.specialty}`
                });
            } else {
                res.json({
                    fulfillmentText: `Sorry, no doctor found with the name ${doctorName}.`
                });
            }
        } catch (error) {
            console.error('Error searching doctor:', error);
            res.json({
                fulfillmentText: 'An error occurred while searching for the doctor.'
            });
        }
    } else {
        res.json({
            fulfillmentText: 'Sorry, I did not understand your request.'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook running on port ${PORT}`);
});