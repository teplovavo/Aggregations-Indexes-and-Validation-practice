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

// Part 2: Adding Additional Features

// Step 1: Adding a new route to get overall stats for student grades


// Adding GET route at '/grades/'
app.get('/grades/stats', async (req, res) => {
    try {
        const db = client.db('sample_training'); // Reference to your database
        const gradesCollection = db.collection('grades'); // Reference to grades collection

        // Create an aggregation pipeline to get overall statistics
        const stats = await gradesCollection.aggregate([
            {
                $unwind: '$scores' // Unwind the 'scores' array to work with each score individually
            },
            {
                $group: {
                    _id: '$_id', // Group by the student's _id to calculate their average score
                    averageScore: { $avg: '$scores.score' } // Calculate the average score for each student
                }
            },
            {
                $group: {
                    _id: null, // Grouping by null to get overall statistics
                    avgAbove50: { $sum: { $cond: [{ $gt: ['$averageScore', 50] }, 1, 0] } }, // Count learners with average score > 50%
                    totalLearners: { $sum: 1 } // Count total number of learners
                }
            },
            {
                $project: {
                    _id: 0, // Exclude '_id' from the output
                    avgAbove50: '$avgAbove50',
                    totalLearners: '$totalLearners',
                    percentageAbove50: { $multiply: [{ $divide: ['$avgAbove50', '$totalLearners'] }, 100] } // Calculate the percentage of learners with avg > 50%
                }
            }
        ]).toArray();

        // Send the stats as a JSON response
        res.json(stats);
    } catch (error) {
        // Handle any errors that may occur
        res.status(500).json({ error: 'An error occurred while fetching stats.' });
    }
});
// Adding debug route to check data structure
app.get('/grades/debug', async (req, res) => {
    try {
        const db = client.db('sample_training'); // Reference to your database
        const gradesCollection = db.collection('grades'); // Reference to the 'grades' collection

        // Fetch first 5 documents from the grades collection for inspection
        const sampleData = await gradesCollection.find({}).limit(5).toArray();

        // Send the sample data as JSON
        res.json(sampleData);
    } catch (error) {
        // Handle any errors that may occur
        res.status(500).json({ error: 'An error occurred while fetching sample data.' });
    }
});
//    [{"avgAbove50":24848,"totalLearners":50012,"percentageAbove50":49.68407582180277}]

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Step 2: Adding a new route to get stats for a specific class

// Adding GET route at '/grades/stats/:id'
app.get('/grades/stats/:id', async (req, res) => {
    try {
        const classId = parseInt(req.params.id); // Get class_id from the URL and convert it to a number
        const db = client.db('sample_training'); // Reference to your database
        const gradesCollection = db.collection('grades'); // Reference to the 'grades' collection

        // Create an aggregation pipeline to get statistics for the specific class
        const classStats = await gradesCollection.aggregate([
            { $match: { class_id: classId } }, // Filter documents by the specified class_id
            {
                $unwind: '$scores' // Unwind the 'scores' array to work with each score individually
            },
            {
                $group: {
                    _id: '$_id', // Group by the student's _id to calculate their average score
                    averageScore: { $avg: '$scores.score' } // Calculate the average score for each student
                }
            },
            {
                $group: {
                    _id: null, // Grouping by null to get overall statistics for the class
                    avgAbove50: { $sum: { $cond: [{ $gt: ['$averageScore', 50] }, 1, 0] } }, // Count learners with average score > 50%
                    totalLearners: { $sum: 1 } // Count total number of learners in the class
                }
            },
            {
                $project: {
                    _id: 0, // Exclude '_id' from the output
                    avgAbove50: '$avgAbove50',
                    totalLearners: '$totalLearners',
                    percentageAbove50: { $multiply: [{ $divide: ['$avgAbove50', '$totalLearners'] }, 100] } // Calculate the percentage of learners with avg > 50%
                }
            }
        ]).toArray();

        // Send the class stats as a JSON response
        res.json(classStats);
    } catch (error) {
        // Handle any errors that may occur
        res.status(500).json({ error: 'An error occurred while fetching class stats.' });
    }
});
