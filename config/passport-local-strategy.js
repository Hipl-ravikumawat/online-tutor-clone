const passport = require("passport"); // require passport
const LocalStrategy = require("passport-local").Strategy; // require the strategy
const User = require("../models/User"); // require user
const bcrypt = require("bcryptjs");
const session = require("express-session"); // Assuming session middleware is configured

// tell passport to use the local strategy for authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passReqToCallback: true,
    },
    // function (req, email, password, done) {
    //   User.findOne({ email: email, isDeleted: false }, function (err, user) {
    //     if (err) {
    //       req.flash("error", err);
    //       return done(err);
    //     }
    //     if (!user) {
    //       req.flash("error", "Incorrect Username  or Password !");
    //       return done(null, false);
    //     }
    //     bcrypt.compare(password, user.password, function (err, isMatch) {
    //       // Get the session object
    //       const loggedUserSession = req.session;
    //       // Remove impersonated user data and impersonation flag (if set)
    //       delete loggedUserSession.impersonatedUser;
    //       delete loggedUserSession.isImpersonating;
    //       if (err) {
    //         console.log(err);
    //       }

    //       if (!isMatch) {
    //         req.flash("error", "Incorrect Username or Password !");
    //         return done(null, false);
    //       } else if (user.status == 0) {
    //         req.flash("error", "Your account is deactivated!");
    //         return done(null, false);
    //       } else {
    //         return done(null, user);
    //       }
    //     });
    //   });
    // }
    function (req, email, password, done) {
      // Determine if input is email or username
      const isEmail = email && email.includes('@');

      let query = {};
      if (isEmail) {
        // It's an email address
        query = { email: email.toLowerCase().trim(), isDeleted: false };
      } else {
        // It's a username
        query = { username: email.toLowerCase().trim(), isDeleted: false };
      }

      User.findOne(query, function (err, user) {
        if (err) {
          req.flash("error", err);
          return done(err);
        }
        if (!user) {
          req.flash("error", "Incorrect Email/Username or Password!");
          return done(null, false);
        }

        bcrypt.compare(password, user.password, function (err, isMatch) {
          // Get the session object
          const loggedUserSession = req.session;
          // Remove impersonated user data and impersonation flag (if set)
          delete loggedUserSession.impersonatedUser;
          delete loggedUserSession.isImpersonating;
          if (err) {
            console.log(err);
          }

          if (!isMatch) {
            req.flash("error", "Incorrect Email/Username or Password!");
            return done(null, false);
          } else if (user.status == 0) {
            req.flash("error", "Your account is deactivated!");
            return done(null, false);
          } else {
            return done(null, user);
          }
        });
      });
    }
  )
);

//serialize the user
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

//deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    if (err) {
      console.log("Error in finding user -->Passport");
      return done(err);
    }
    return done(null, user);
  });
});

// check if the user is authenticated
passport.checkAuthentication = function (req, res, next) {
  //if the user is signed in then pass on request to next function which is controller's action)
  if (req.isAuthenticated()) {
    return next();
  }
  // redirect to login page.
  return res.redirect("/");
};

//set the authenticated user
passport.setAuthenticatedUser = function (req, res, next) {
  if (req.isAuthenticated()) {
    //contains the current signed in user from the session cookie. We are sending this to locals for the views
    if (req.user.status === 0 || req.user.isDeleted === true) {
      req.session.destroy();
      return res.redirect("/");
    }
    // User is active, proceed with the request
    res.locals.loggedUserInfo = req.user;
  }
  next();
};
module.exports = passport;