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
        let doctorName = parameters['doctor-name'];

        if (!doctorName) {
            return res.json({
                fulfillmentText: 'Please provide a doctor name to search.'
            });
        }

        try {
            const snapshot = await db.ref('/doctors').once('value');

            let foundDoctor = null;

            snapshot.forEach(childSnapshot => {
                const doctor = childSnapshot.val();
                if (doctor.name.toLowerCase() === doctorName.toLowerCase()) {
                    foundDoctor = doctor;
                }
            });

            if (foundDoctor) {
                const specialty = foundDoctor.TherapySpecialty || 'Not specified';
                const wilaya = foundDoctor.wilaya || 'Not specified';
                const price = foundDoctor.price || 'Not specified';

                res.json({
                    fulfillmentText: `Doctor ${foundDoctor.name} found! Specialty: ${specialty}, Wilaya: ${wilaya}, Price: ${price} OMR.`
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