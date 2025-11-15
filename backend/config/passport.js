import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import config from './index.js';
import logger from '../utils/logger.js';

export function configurePassport() {
    passport.use(new GoogleStrategy({
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        const newUser = {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
        };

        try {
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                return done(null, user);
            }

            user = await User.findOne({ email: newUser.email });
            if (user) {
                user.googleId = newUser.googleId;
                user.avatar = newUser.avatar;
                user.isVerified = true;
                await user.save();
                logger.info('Google account linked to existing user', { userId: user._id });
                return done(null, user);
            }

            newUser.isVerified = true;
            user = await User.create(newUser);
            logger.info('New user created via Google OAuth', { userId: user._id });
            return done(null, user);

        } catch (err) {
            logger.error('Google OAuth authentication failed', { error: err.message });
            done(err, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => done(err, user));
    });

    logger.info('Passport configured for Google OAuth');
}