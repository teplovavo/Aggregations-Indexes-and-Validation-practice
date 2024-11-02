import 'dotenv/config'; // Import environment variables from .env file
import express from 'express'; // Import express for creating the server
import { MongoClient } from 'mongodb'; // Import MongoClient to connect to MongoDB

const app = express(); // Create an instance of express
const PORT = process.env.PORT || 3000; // Set the port for the server

const connectionString = process.env.ATLAS_URI; // Get the connection string from environment variables
const client = new MongoClient(connectionString); // Create a new MongoClient instance

// Middleware to parse JSON requests
app.use(express.json()); 

// Function to connect to MongoDB
async function connectDB() {
    try {
        await client.connect(); // Attempt to connect to the database
        console.log('Connected to MongoDB'); // Log success message
    } catch (error) {
        console.error('Error connecting to MongoDB:', error); // Log any connection errors
    }
}

// Call the connectDB function to establish connection
connectDB();

// Sample route to test server
app.get('/', (req, res) => {   
    res.send('Hello World!'); // Send a response for the root route
});

// Start the server
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`); // Log when the server starts
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////