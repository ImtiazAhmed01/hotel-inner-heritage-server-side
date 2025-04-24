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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
                const filter = {};
                const { minPrice, maxPrice } = req.query;
                if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
                if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };

                // Fetch filtered rooms
                const rooms = await roomsCollection.find(filter).toArray();
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
        app.get('/reviews', async (req, res) => {
            try {
                const roomId = req.query.roomId;
                let query = {}
                if (roomId) {
                    query = { roomId }
                }
                const reviews = await client
                    .db("hotelinnerheritageRooms")
                    .collection("reviews")
                    .find(query)
                    .sort({ timestamp: -1 }) // Sort by timestamp in descending order
                    .toArray();
                res.send(reviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.post('/reviews', async (req, res) => {
            console.log("----- New Review Request Received -----");
            console.log("Raw Request Body:", req.body); // Log full request body

            const { roomId, rating, reviewText, userEmail, reviewer, roomName, image, price } = req.body;

            console.log("Extracted Fields:");
            console.log("roomId:", roomId);
            console.log("roomName:", roomName);
            console.log("image:", image);
            console.log("price:", price);
            console.log("reviewer:", reviewer);
            console.log("userEmail:", userEmail);
            console.log("rating:", rating);
            console.log("reviewText:", reviewText);

            if (!roomId || !rating || !reviewText || !userEmail || !reviewer || !roomName || !image || !price) {
                console.log("Missing required fields. Rejecting request.");
                return res.status(400).send({ message: 'All fields are required.' });
            }

            try {
                console.log(`Checking if user (${userEmail}) has booked room (${roomId})...`);
                const booking = await client.db("hotelinnerheritageRooms").collection("bookings").findOne({
                    roomId,
                    userEmail
                });

                if (!booking) {
                    console.log("User has not booked this room. Rejecting request.");
                    return res.status(403).send({ message: 'You can only review rooms you have booked.' });
                }

                const reviewData = {
                    roomId,
                    roomName,
                    image,
                    price,
                    reviewer,
                    userEmail,
                    rating: parseInt(rating),
                    reviewText,
                    timestamp: new Date()
                };

                console.log("Final Data Before Insertion:", reviewData); // Log review data before inserting

                // Insert into MongoDB
                const result = await client.db("hotelinnerheritageRooms").collection("reviews").insertOne(reviewData);
                console.log("Review Inserted Successfully:", result.insertedId);

                res.status(201).send({ message: 'Review submitted successfully.' });
            } catch (error) {
                console.error("Error submitting review:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });




        app.get('/reviews', async (req, res) => {
            const { roomId } = req.query; // roomId from query parameter, coming from the frontend

            try {
                // Fetch reviews where roomId matches the provided roomId string
                const reviews = await client
                    .db("hotelinnerheritageRooms")
                    .collection("reviews")
                    .find({ roomId }) // Compare directly as a string
                    .sort({ timestamp: -1 }) // Sort by timestamp in descending order
                    .toArray();

                res.send(reviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });
        app.get('/review', async (req, res) => {
            const { roomId, userEmail } = req.query; // Get roomId and userEmail from query parameters

            try {
                const query = {};
                if (roomId) query.roomId = roomId;
                if (userEmail) query.userEmail = userEmail; // Filter by userEmail if provided

                const reviews = await client
                    .db("hotelinnerheritageRooms")
                    .collection("reviews")
                    .find(query)
                    .sort({ timestamp: -1 }) // Sort reviews by latest first
                    .toArray();

                res.send(reviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.post('/bookings/review/:id', async (req, res) => {
            const bookingId = req.params.id;
            const { reviewText, rating, userEmail, timestamp } = req.body;
            try {
                const booking = await booking.findById(bookingId);
                if (!booking) {
                    return res.status(404).send("Booking not found");
                }

                booking.reviews.push({ reviewText, rating, userEmail, timestamp });
                await booking.save();
                await roomsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $inc: { reviewCount: 1 } }
                );
                res.status(200).send("Review submitted successfully");

            } catch (error) {
                console.error(error);
                res.status(500).send("Failed to submit review");
            }
        });

        // booking
        app.post('/rooms/:id/book', async (req, res) => {
            const { id } = req.params;
            const { userEmail, checkInDate, checkOutDate, bookingDate } = req.body;

            if (!userEmail || !checkInDate || !checkOutDate || !bookingDate) {
                return res.status(400).send({ message: "All fields are required: userEmail, checkInDate, checkOutDate, and bookingDate." });
            }

            try {
                const room = await roomsCollection.findOne({ _id: new ObjectId(id) });
                if (!room) {
                    return res.status(404).send({ message: "Room not found." });
                }
                if (!room.availability) {
                    return res.status(400).send({ message: "Room is already booked." });
                }

                const bookingData = {
                    roomId: id,
                    roomName: room.name || "Unknown",
                    roomImage: room.image || "",
                    price: room.price || 0,
                    checkInDate,
                    checkOutDate,
                    bookingDate: new Date(bookingDate),
                    userEmail,
                    status: "Booked",
                    timestamp: new Date(),
                };
                await client.db("hotelinnerheritageRooms").collection("bookings").insertOne(bookingData);

                await roomsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { availability: false } }
                );

                res.send({ message: "Room booked successfully.", bookingData });
            } catch (error) {
                console.error("Error booking room:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });


        app.get('/user/bookings', async (req, res) => {
            const { userEmail } = req.query;
            if (!userEmail) {
                return res.status(400).json({ error: "User ID is required" });
            }

            try {
                const bookings = await client.db("hotelinnerheritageRooms").collection("bookings").find({ userEmail }).toArray();
                res.json(bookings);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });



        app.delete('/bookings/:id', async (req, res) => {
            const { id } = req.params;

            try {

                const booking = await client
                    .db("hotelinnerheritageRooms")
                    .collection("bookings")
                    .findOne({ _id: new ObjectId(id) });

                if (!booking) {
                    return res.status(404).send({ message: 'Booking not found' });
                }

                const result = await client
                    .db("hotelinnerheritageRooms")
                    .collection("bookings")
                    .deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Booking not found' });
                }


                const roomUpdateResult = await roomsCollection.updateOne(
                    { _id: new ObjectId(booking.roomId) },
                    { $set: { availability: true } }
                );

                if (roomUpdateResult.modifiedCount === 0) {
                    return res.status(500).send({ message: 'Failed to update room availability' });
                }

                res.send({ message: 'Booking cancelled and room availability restored' });
            } catch (error) {
                console.error("Error cancelling booking:", error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });


        app.patch('/bookings/:id', async (req, res) => {
            const { id } = req.params;
            const { newDate } = req.body;
            try {
                const result = await client
                    .db("hotelinnerheritageRooms")
                    .collection("bookings")
                    .updateOne(
                        { _id: new ObjectId(id) },
                        { $set: { bookingDate: new Date(newDate) } }
                    );
                if (result.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Booking not found or date not changed' });
                }
                res.send({ message: 'Booking date updated' });
            } catch (error) {
                console.error("Error updating booking date:", error);
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
