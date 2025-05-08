const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
app.use(bodyParser.json());

// حمّل مفتاح الخدمة من Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com'
});
const db = admin.database();

app.post('/webhook', (req, res) => {
    const intent = req.body.queryResult.intent.displayName;
    const parameters = req.body.queryResult.parameters;

    if (intent === 'حجز موعد') {
        const name = parameters['name'];

        db.ref('/appointments').push({
            name: name,
            status: 'pending'
        });

        res.json({
            fulfillmentText: تم تسجيل موعد باسم ${name}
        });
    } else {
        res.json({
            fulfillmentText: 'لم أفهم طلبك!'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(Webhook شغّال على المنفذ ${PORT});
});