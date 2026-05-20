import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import pg from "pg";
import session from "express-session";
import methodOverride from "method-override";
import multer from "multer"; // important for handle file uploads
import bcrypt from "bcrypt"; // For hashing passwords securely
import passport, { Passport } from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// Configure dotenv
dotenv.config();

const app = express();
const PORT = 3000;

const saltRounds = 10; // number of times to run the hashing math

const API_KEY = process.env.SCH_DICT_API_KEY;

const upload = multer({ dest: "uploads/" }); // Tells multer where to temporarily store files

// Use middlewares, body parser & method override
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Use static files
app.use(express.static("public"));

// Tell express to use ejs
app.set("view engine", "ejs");

// Set up a session
app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// PASSPORT SETUP, after session
// Initialize Passport authentication middleware
app.use(passport.initialize());

// Enable persistent login sessions
app.use(passport.session());

// Set up database
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Establish connection with postgres server
db.connect();

// GET route for homepage
app.get("/", (req, res) => {
  const user = req.session.user || null;
  res.render("index.ejs", { user: user });
});

// GET route for register page
app.get("/signup", (req, res) => {
  res.render("pages/register.ejs", {
    message: "",
    formData: {},
  });
});

// GET route for the login page
app.get("/login", (req, res) => {
  res.render("pages/login.ejs", {
    message: "",
    formData: {},
  });
});

// GET route for password recovery page
app.get("/recover", (req, res) => {
  res.render("pages/recover.ejs");
});

// GET redirect route for sign up
app.get("/register", (req, res) => {
  res.redirect("signup");
});

// POST route for sign up
app.post("/register", async (req, res) => {
  const { email, firstName, lastName, password, confirmPassword } = req.body;

  // We first check if the user is already exists
  try {
    const checkResult = await db.query(
      `SELECT * FROM users WHERE email = $1;`,
      [email],
    );

    if (checkResult.rows.length > 0) {
      return res.render("pages/register.ejs", {
        message: "User already exists, Try loggin in",
        formData: {},
      });
    }

    // Make sure the passwords match
    if (password !== confirmPassword) {
      // Stop here, if password mismatch
      return res.render("pages/register.ejs", {
        message: "Password do not match",
        formData: { email, firstName, lastName },
      });
    }

    // Hash password before saving
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      if (err) {
        console.error("Error hashing password: ", err);
      } else {
        console.log("Hashed password: ", hash);
        // add user to db
        const result = await db.query(
          `INSERT INTO users (first_name, last_name, email, password)
           VALUES ($1, $2, $3, $4) RETURNING *; 
          `,
          [firstName, lastName, email, hash],
        );

        const user = result.rows[0];
        console.log(user);

        // save user to session
        req.session.user = user;

        res.redirect("/");
      }
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).send("An internal error occurred.");
  }
});

// Create a post route for login
app.post("/login", async (req, res) => {
  const { email, password: loginPassword } = req.body;

  try {
    const result = await db.query(
      `SELECT * 
       FROM users
       WHERE email = $1
      `,
      [email],
    );

    // Check if user isn't registered yet
    if (result.rows.length === 0) {
      return res.render("pages/login.ejs", {
        message: "User do not exists, Try signing up",
        formData: {},
      });
    }

    const user = result.rows[0];
    console.log(user);
    const storedHashedPassword = user.password;

    // Verifying the password
    bcrypt.compare(loginPassword, storedHashedPassword, async (err, result) => {
      if (err) {
        console.error("Error comparing passwords: ", err);
      } else {
        if (result) {
          console.log("This is the compare result: ", result);

          // Save user into session
          req.session.user = user;

          // Check if user has a search history
          const recentQueries = await getRecentQueries(req.session.user.id);

          // Take user to search history page
          if (recentQueries?.length) {
            return res.redirect("/search_history");
          }

          // Redirect to homepage
          res.redirect("/");
        } else {
          // If password is incorrect
          return res.render("pages/login.ejs", {
            message: "Incorrect password, try login in again",
            formData: { email },
          });
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An internal error occurred.");
  }
});

// Create a get route to log out, passport method to remove user from session
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Create GET route for profile page
app.get("/profile", async (req, res) => {
  // Ensure if user isnt in session, send to login
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    // Get user
    const result = await db.query(
      `SELECT *
       FROM users
       WHERE id = $1
     `,
      [req.session.user.id],
    );

    const user = result.rows[0];
    console.log(user);
    res.render("pages/profile.ejs", { user: user });
  } catch (err) {
    console.error("Database Error: ", err);
  }
});

// Create GET route for change password page
app.get("/change_password", async (req, res) => {
  // Ensure if user isnt logged in, send to login
  if (!req.session.user) {
    return res.redirect("/login");
  }

  // Get current user using the session ID
  const result = await db.query(
    `SELECT *
     FROM users
     WHERE id = $1
     `,
    [req.session.user.id],
  );

  const user = result.rows[0];

  res.render("pages/password.ejs", { user: user, message: "" });
});

// Create PUT route to update a user details
app.put("/users/:id", upload.single("profile_picture"), async (req, res) => {
  // Ensure if user isnt logged in, send to login
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = parseInt(req.params.id);
  const { firstName, lastName, email } = req.body;

  // Update the user details
  try {
    const result = await db.query(
      `UPDATE users
       SET first_name = $1,
          last_name = $2,
          email = $3
          WHERE id = $4
          RETURNING *`,
      [firstName, lastName, email, userId],
    );

    const user = result.rows[0];
    console.log(user);

    // save updated user into session
    req.session.user = user;

    res.redirect("/");
  } catch (error) {
    console.log("Database Error: ", error);
  }
});

// Create PUT route to update user password
app.put("/users/:id/change_password", async (req, res) => {
  // Ensure if user isnt logged in, send to login
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const { currentPassword, newPassword, confirmedNewPassword } = req.body;
  const userId = parseInt(req.params.id);

  // Get password stored
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [
      req.session.user.id,
    ]);

    const user = result.rows[0];
    const storedPassword = user.password;

    // Check if the current password is correct
    if (currentPassword !== storedPassword) {
      return res.render("pages/password.ejs", {
        user: user,
        message: "The current password entered is incorrect",
      });
    }

    // Check if the new password & confirm new password are the same
    if (newPassword !== confirmedNewPassword) {
      return res.render("pages/password.ejs", {
        user: user,
        message: "Passwords do not match",
      });
    }

    // Check if the new password is the same as the stored one
    if (newPassword === storedPassword) {
      return res.render("pages/password.ejs", {
        user: user,
        message: "New password must be different from your current password",
      });
    }

    // update user password
    await db.query("UPDATE users SET password = $1 WHERE id = $2;", [
      newPassword,
      userId,
    ]);

    // save user in session
    req.session.user = user;

    res.render("pages/password.ejs", {
      user: user,
      message: "Password successfully changed !",
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("An internal error occurred.");
  }
});

// Create method to get only data needed
const simplifyResult = (data, query) => {
  let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = new RegExp(`^${escapedQuery}(:[a-z0-9]+)?$`, "i");

  // filter the exact word searched
  let filteredResult = data.filter((result) => pattern.test(result.meta.id));

  // Get only properties needed for UI.
  const head = filteredResult[0].hwi;
  const headWord = head.hw.replace(/[^a-zA-Z]/g, "");
  const phonetics = head.prs[0]?.mw || "N/A";
  const sound = head.prs[0].sound.audio;
  const definitions = filteredResult.map((definition) => {
    return { pos: definition.fl, def: definition.shortdef };
  });

  return { hw: headWord, pho: phonetics, sound: sound, meaning: definitions };
};

// Create method to get user recent search
const getRecentQueries = async (userId) => {
  try {
    const queries = await db.query(
      `SELECT word, MAX(searched_at) AS last_searched
          FROM search_history
          WHERE user_id = $1
          GROUP BY word
          ORDER BY last_searched DESC
          LIMIT 5;    `,
      [userId],
    );

    return queries.rows;
  } catch (error) {
    console.error("Database Error in getQuerires method: ", error);
    throw Error;
  }
};

// Create a get route for the history, for logged in users, with a search history
app.get("/search_history", async (req, res) => {
  // check if user is logged in
  if (!req.session.user) {
    return res.redirect("/");
  }

  // get logged user
  const user = req.session.user;

  try {
    // Check if user clicked a history link
    const clickedWord = req.query.q;
    // data should be null, here
    let data = null;

    // fetch word meaning from API, directly
    if (clickedWord) {
      const word = clickedWord.trim();

      const url = `https://www.dictionaryapi.com/api/v3/references/sd4/json/${word}?key=${API_KEY}`;
      const response = await axios.get(url);
      const result = response.data;

      data = simplifyResult(result, word);

      // Check if the data is valid,  & update database timestamp
      if (data) {
        await db.query(
          "INSERT INTO search_history (word, user_id) VALUES($1, $2)",
          [word, user.id],
        );
      }
    } else {
      // Grab the search result saved during the POST search, fallback
      data = req.session.lastSearchResult || null;

      // Clear it from the session so it doesn't linger on a page refresh
      req.session.lastSearchResult = null;
    }

    // get latest searched words, limit it to
    const recentQueries = await getRecentQueries(user.id);

    res.render("pages/history.ejs", {
      lexicon: data,
      recentWords: recentQueries,
      user: user,
    });
  } catch (error) {
    console.error("Error in GET search_history", error);
    res.status(500).send("Database error");
  }
});

// Create post route to search for a word or phrase
app.post("/search", async (req, res) => {
  try {
    const word = req.body.word.trim();

    if (!word) {
      return res.status(404).json({
        message: "No word provided, please kindly provide a word",
      });
    }

    const url = `https://www.dictionaryapi.com/api/v3/references/sd4/json/${word}?key=${API_KEY}`;
    const response = await axios.get(url);
    const result = response.data;

    const data = simplifyResult(result, word);
    console.log(data);

    // Save the search result to the session so the next page can grab it
    req.session.lastSearchResult = data;

    // Check if user is in session, & search was successful
    if (req.session.user && data) {
      try {
        // insert successfully searched into search history
        const user = req.session.user;
        await db.query(
          "INSERT INTO search_history (word, user_id) VALUES($1, $2)",
          [word, user.id],
        );

        return res.redirect("/search_history");
      } catch (error) {
        console.log(error);
      }
    }

    res.render("index.ejs", {
      lexicon: data,
      user: null,
    });
  } catch (error) {
    console.error("Failed to make request", error);
    res.render("index.ejs", {
      error: "No meaning for word",
    });
  }
});

// Register a passport local strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" }, // Tell passport that instead of name='username' (as it expects), its email

    async function verify(email, password, cb) {
      try {
        // Get user
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);

        // if user doesnt exist
        if (result.rows.length === 0) {
          return cb(null, false, { message: "Incorrect password or email" });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password); // verify user, compare passwords

        // if user passes verification
        if (isMatch) {
          return cb(null, user, { message: "Incorrect password or email" });
        } else {
          return cb(null, false);
        }
      } catch (err) {
        return cb(err);
      }
    },
  ),
);

// Save user id to session cookie container
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

// Take the user ID out of the session and fetch full info from DB
passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM WHERE id = $1", [id]);
    const user = result.rows[0];

    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
