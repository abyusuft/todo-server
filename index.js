const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
// app.use(cors());
app.use(cors());
app.use(express.json());


// Database Connection 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kqnws.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();

        const usersCollection = client.db("taskdone").collection("users");

        // Generate Token on UserLogin and send user to database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const doc = {
                $set: user,
            }
            const result = await usersCollection.updateOne(filter, doc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' });
            res.send({ result, token });
        })




        //Task database collection and API
        const taskCollection = client.db("taskdone").collection("tasks");

        app.post('/task', verifyJWT, async (req, res) => {
            const task = req.body;
            const insert = await taskCollection.insertOne(task);
            res.send(insert);
        })

        // Get Pending Task List
        app.get('/pendingtask/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email, status: 'pending' };
            const cursor = taskCollection.find(filter);
            const result = await cursor.toArray();
            res.send(result);

        })
        app.get('/completed/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email, status: 'complete' };
            const cursor = taskCollection.find(filter);
            const result = await cursor.toArray();
            res.send(result);

        })
        app.put('/markcomplete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const doc = {
                $set: { status: 'complete' },
            }
            const result = await taskCollection.updateOne(filter, doc);
            res.send(result);
        })



    }


    finally {

    }

}

run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Welcome to Task Done')
})


app.listen(port, () => {
    console.log(`Listening to Port : ${port}`)
})