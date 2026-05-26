// Authentication via Password

// Imports
import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { db } from "./index.js";
import dotenv from "dotenv";

// Configure dotenv
dotenv.config();

// Set up a Passport Local Strategy
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
          return cb(null, false, {
            message: "User do not exists, Try signing up",
          });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password); // verify user, compare passwords

        // if user passes verification
        if (isMatch) {
          return cb(null, user);
        } else {
          return cb(null, false, {
            message: "Incorrect password, try login in again",
          });
        }
      } catch (err) {
        return cb(err);
      }
    },
  ),
);

// Set up a Google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },

    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        // if user does not exit
        if (result.rows.length === 0) {
          // destructure needed properties from google data
          const {
            name: { givenName, familyName },
            email,
          } = profile;
          const newUser = await db.query(
            `INSERT INTO users 
             (first_name, last_name, email, password) 
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [givenName, familyName, email, "google"],
          );
          cb(null, newUser.rows[0]);
        } else {
          // Already have an existing user
          const user = result.rows[0];
          cb(null, user);
        }
      } catch (err) {
        cb(err);
      }
    },
  ),
);

// Set up Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile?.emails[0]?.value,
        ]);
        // if user does not exit
        if (result.rows.length === 0) {
          // destructure needed properties from fb data
          const {
            displayName,
            emails: [{ value: email }],
          } = profile;
          const [firstName, lastName] = displayName.split(" ");
          const newUser = await db.query(
            `INSERT INTO users 
             (first_name, last_name, email, password) 
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [firstName, lastName, email, "facebook"],
          );
          cb(null, newUser.rows[0]);
        } else {
          // Already have an existing user
          const user = result.rows[0];
          cb(null, user);
        }
      } catch (err) {
        cb(err);
      }
    },
  ),
);

// Save user id to session cookie container
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

// Take the user ID out of the session and fetch full user obj from DB
passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];

    cb(null, user);
  } catch (err) {
    cb(err);
  }
});
