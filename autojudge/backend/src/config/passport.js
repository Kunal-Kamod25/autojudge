// This file drives the passport feature flow and keeps the behavior easy to reason about.
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); } catch(e) { done(e); }
});

// Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const user = await User.findOne({ email }).select('+password');
    // Quick guard clause so we fail fast before doing heavier work.
    if (!user || !user.password) return done(null, false, { message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    // Quick guard clause so we fail fast before doing heavier work.
    if (!match) return done(null, false, { message: 'Invalid credentials' });
    return done(null, user);
  } catch(e) { return done(e); }
}));

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) { user.googleId = profile.id; await user.save(); }
        else {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value,
            role: 'student',
            isVerified: true
          });
        }
      }
      return done(null, user);
    } catch(e) { return done(e); }
  }));
}

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
    scope: ['user:email'],
    proxy: true
  }, async (accessToken, refreshToken, profile, done) => {
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
        user = await User.findOne({ email });
        if (user) { user.githubId = profile.id; await user.save(); }
        else {
          user = await User.create({
            githubId: profile.id,
            name: profile.displayName || profile.username,
            email,
            avatar: profile.photos[0]?.value,
            role: 'student',
            isVerified: true
          });
        }
      }
      return done(null, user);
    } catch(e) { return done(e); }
  }));
}
