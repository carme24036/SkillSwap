// JUNIORS SHOULD NOT TOUCH THIS FILE UNLESS THEY ARE GIVEN AN ISSUE THAT INVOLVES THIS FILE
// ***************************************************************************************** \\
//              This file is the main server file for the SkillSwap project                  \\
//               It is responsible for handling all requests and responses                   \\
//                It also connects to the database and sets up the server                    \\
// ***************************************************************************************** \\  

// Constants
const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require("sqlite3");
const bcrypt = require('bcrypt');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const bodyParser = require('body-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const { parse } = require('dotenv');
const port = 5500;
const saltRounds = 5; // for bcrypt

// Get middleware for file upload
const filesPayloadExists = require('./middleware/filesPayloadExists');
const fileExtLimiter = require('./middleware/fileExtLimiter');
const fileSizeLimiter = require('./middleware/fileSizeLimiter');

// Connect to the database
const db = new sqlite3.Database('Users.db');

// sets up the app to use ejs and public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'skillswap',
    resave: false,
    saveUninitialized: true,
}));

// Login route
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

// Handle login form submission
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    // Query the database to find the user
    db.get(`SELECT * FROM users WHERE Name = ?`, [username], (err, row) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send({ error: 'Database error' });
        }
        // If the user is found
        if (row) {
            // Compare the provided password with the stored hash using bcrypt for encryption
            bcrypt.compare(password, row.Password, function (err, result) {
                if (err) {
                    console.log(err.message);
                    return res.status(500).send({ error: 'Error comparing passwords' });
                }
                if (result) {
                    // If the password is correct, set the session user and redirect to index (home page)
                    req.session.user = row;
                    return res.redirect('/index');
                } else {
                    // If the password is incorrect, send an error message
                    return res.status(401).send({ error: 'Incorrect password' });
                }
            });
        } else {
            // If the user is not found, send an error message
            return res.redirect('/login?error=User not found');
        };
    });
});

// link create.ejs to app.js
app.get('/create', (req, res) => {
    res.render('create.ejs');
});

// Handle create form submission
app.post('/signup', (req, res) => {
    const password = req.body.password;
    const username = req.body.username;
    const email = req.body.email;
    const skills = req.body.skills;
    const seeking = req.body.seeking;
    const description = req.body.description;
    const classPos = req.body.class;
    const job = req.body.job;
    bcrypt.hash(password, saltRounds, function (err, hash) {
        db.run(`INSERT INTO users(Name, Password, Email, Skills, Seeking, Description, Class, Job) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`, [username, hash, email, skills, seeking, description, classPos, job], function (err) {
            if (err) {
                console.log(err.message);
                return res.status(500).send({ error: 'Database error' });
            } else {
                // get the last insert id
                console.log(`A row has been inserted with row-ID ${this.lastID}`);
                return res.redirect('/index');
            }
        });
    });
});

// search endpoint
app.get('/search', (req, res) => {
    const query = req.query.query;
    db.all(`SELECT * FROM users WHERE name LIKE ?`, [`%${query}%`], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        else {
            res.render('index', { users: rows });
        }
    });
});

// link index.ejs to app.js
app.get('/index', (req, res) => {
    if (req.session.user) {
        db.all(`SELECT * FROM users`, [], (err, rows) => {
            if (err) {
                return console.error(err.message);
            }
            res.render('index', { users: rows });
        });
    } else {
        res.redirect('/login');
    }
});

const users = [];

// link profiles.ejs to app.js
app.get('/profiles/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    db.get(`SELECT * FROM users WHERE ID = ?`, userId, (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        let resume;
        // search upload for a file with the same name as the profile's username

        //if it exists, set the profile's resume to the file path

        res.render('profiles', { user: row, resume: resume });
    });
});

// link editProfile.ejs to app.js
app.get('/myProfile', (req, res) => {
    if (req.session.user) {
        const userId = req.session.user.ID;
        db.get(`SELECT * FROM users WHERE ID = ?`, userId, (err, row) => {
            if (err) {
                return console.error(err.message);
            }
            res.render('myProfile', { user: row });
        });
    } else {
        res.redirect('/login');
    }
});

// link editProfile.ejs to app.js
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// link certificationTest.ejs to app.js
app.get('/certificationTest', (req, res) => {
    // Render the certification tests page with the certification tests data
    res.render('certificationTest',);
});

// link newAlum.ejs to app.js
app.get('/newAlum', (req, res) => {
    res.render('newAlum.ejs');
});

// Handle form submission for New Alumni Page
app.post('/newStudent', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const legacy = req.body.legacy;
    db.run(`INSERT INTO alumni(Name, Email, Legacy) VALUES(?, ?, ?)`, [name, email, legacy], function (err) {
        if (err) {
            console.log(err.message);
            return res.status(500).send({ error: 'Database error' });
        } else {
            // get the last insert id
            console.log(`Alumni has been added sucessfully. Row-ID is ${this.lastID}`);
            return res.redirect('/alumni');
        }
    });
});

// link alumni.ejs to app.js
app.get('/alumni', (req, res) => {
    db.all(`SELECT * FROM alumni`, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        res.render('alumni', { alumni: rows });
    });
});

// link upload.ejs to app.js
app.get('/upload', (req, res) => {
    res.render('upload.ejs');
});

// Handle file upload
app.post('/upload', filesPayloadExists, fileExtLimiter, fileSizeLimiter, (req, res) => {
    const file = req.files.file;
    const username = req.session.user.Name;
    const filePath = `uploads/${username}.pdf`;
    file.mv(filePath, (err) => {
        if (err) {
            return res.status(500).send({ error: 'Error uploading file' });
        }
        res.redirect('/myProfile');
    });
});

// link showcase.ejs to app.js
app.get('/showcase', (req, res) => {
    res.render('showcase.ejs');
});

// listen on port 5500
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/login`);
});