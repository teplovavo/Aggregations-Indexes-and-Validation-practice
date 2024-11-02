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

// Step 2: Adding a new route to get stats for a specific class with more logging for debugging

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
        console.error('Error occurred:', error);
        res.status(500).json({ error: 'An error occurred while fetching class stats.' });
    }
});
//    [{"avgAbove50":48,"totalLearners":102,"percentageAbove50":47.05882352941176}]

//test result
//Class stats: [
    // {
    //     avgAbove50: 48,
    //     totalLearners: 102,
    //     percentageAbove50: 47.05882352941176
    //   }
    // ]


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Function to create necessary indexes in the grades collection
async function createIndexes() {
    try {
        const db = client.db('sample_training'); // Reference to the database
        const gradesCollection = db.collection('grades'); // Reference to the 'grades' collection

        // Create a single-field index on class_id
        await gradesCollection.createIndex({ class_id: 1 });
        console.log('Index created on class_id');

        // Create a single-field index on learner_id
        await gradesCollection.createIndex({ learner_id: 1 });
        console.log('Index created on learner_id');

        // Create a compound index on learner_id and class_id, both ascending
        await gradesCollection.createIndex({ learner_id: 1, class_id: 1 });
        console.log('Compound index created on learner_id and class_id');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

// Call the createIndexes function after connecting to MongoDB
connectDB().then(createIndexes);

//indexes created, single and combined


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Function to add validation rules to the grades collection
async function addValidation() {
    try {
        const db = client.db('sample_training'); // Reference to your database

        // Use the 'collMod' command to add validation to the 'grades' collection
        await db.command({
            collMod: 'grades',
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['class_id', 'learner_id'],
                    properties: {
                        class_id: {
                            bsonType: 'int',
                            minimum: 0,
                            maximum: 300,
                            description: 'class_id must be an integer between 0 and 300 inclusive'
                        },
                        learner_id: {
                            bsonType: 'int',
                            minimum: 0,
                            description: 'learner_id must be an integer greater than or equal to 0'
                        }
                    }
                }
            },
            validationAction: 'warn' // Set validation action to "warn"
        });

        console.log('Validation rules added to grades collection');
    } catch (error) {
        console.error('Error adding validation:', error);
    }
}

// Call the addValidation function after creating indexes
createIndexes().then(addValidation);

// // result: {
//   $jsonSchema: {
//     bsonType: 'object',
//     required: [
//       'class_id',
//       'learner_id'
//     ],
//     properties: {
//       class_id: {
//         bsonType: 'int',
//         minimum: 0,
//         maximum: 300,
//         description: 'class_id must be an integer between 0 and 300 inclusive'
//       },
//       learner_id: {
//         bsonType: 'int',
//         minimum: 0,
//         description: 'learner_id must be an integer greater than or equal to 0'
//       }
//     }
//   }
// }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Adding a temporary route to test validation
app.post('/grades/test-validation', async (req, res) => {
    try {
        const db = client.db('sample_training');
        const gradesCollection = db.collection('grades');

        // Example document that violates validation rules (class_id is out of range)
        const invalidDocument = {
            class_id: 500, // Invalid value: should be between 0 and 300
            learner_id: -1, // Invalid value: should be >= 0
            scores: [
                { type: 'exam', score: 85 },
                { type: 'quiz', score: 92 }
            ]
        };

        // Insert the invalid document
        await gradesCollection.insertOne(invalidDocument);
        res.send('Document inserted (check for warnings in MongoDB Compass)');
    } catch (error) {
        console.error('Error inserting document:', error);
        res.status(500).send('Error inserting document.');
    }
});


//   Document inserted (check for warnings in MongoDB Compass)
// alab-319.4: done

