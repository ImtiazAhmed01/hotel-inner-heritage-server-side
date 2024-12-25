const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
const { ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        const database = client.db("hotelinnerheritageRooms");
        const roomsCollection = database.collection("rooms");

        app.get('/featured-rooms', async (req, res) => {
            try {
                // Fetch rooms sorted by rating in descending order, limiting to 6
                const rooms = await roomsCollection.find().sort({ rating: -1 }).limit(6).toArray();
                res.send(rooms);
            } catch (error) {
                console.error("Error fetching featured rooms:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.get('/rooms', async (req, res) => {
            try {
                const rooms = await roomsCollection.find().toArray();
                res.send(rooms);
            } catch (error) {
                console.error("Error fetching rooms:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });
        // for room detail


        app.get('/rooms/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
                if (room) {
                    res.send(room);
                } else {
                    res.status(404).send({ message: 'Room not found' });
                }
            } catch (error) {
                console.error("Error fetching room:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });
        // for reviews
        // For fetching reviews based on roomId
        app.get('/rooms/:id/reviews', async (req, res) => {
            const { id } = req.params; // Extract room ID from URL
            const reviewsCollection = client.db("hotelinnerheritageRooms").collection("reviews");

            try {
                // Convert roomId to a number if stored as a number
                const roomId = parseInt(id, 10);
                const reviews = await reviewsCollection.find({ roomId }).toArray();
                if (reviews.length > 0) {
                    res.send(reviews);
                } else {
                    res.status(404).send({ message: 'No reviews found for this room' });
                }
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });



    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
    // finally {
    //     // // Ensures that the client will close when you finish/error
    //     // await client.close();
    // }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('SIMPLE CRUD IS RUNNING')
})
app.listen(port, () => {
    console.log(`SIMPLE crud is running on port: ${port}`)

})