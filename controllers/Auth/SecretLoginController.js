const session = require("express-session"); // Assuming session middleware is configured
const User = require("../../models/User");

module.exports = {
  secretLogin,
  exitSecretLogin,
};

/**
 * secret login .
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function secretLogin(req, res) {
  try {
    const impersonatedUser = await User.findById(req.params.id);
    const loggedUserSession = req.session;
    loggedUserSession.impersonatedUser = impersonatedUser;
    loggedUserSession.isImpersonating = true;
    return res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * exit secret login.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function exitSecretLogin(req, res) {
  try {
    // Get the session object
    const loggedUserSession = req.session;
    // Remove impersonated user data and impersonation flag (if set)
    delete loggedUserSession.impersonatedUser;
    delete loggedUserSession.isImpersonating;

    return res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}