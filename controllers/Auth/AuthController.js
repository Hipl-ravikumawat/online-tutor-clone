const User = require("../../models/User");
const mail = require("../../config/mail");
const randomstring = require("randomstring");
const global = require("../../_helper/GlobalHelper");
const fs = require("fs");
const MailTemplates = require("../../_helper/MailTemplates");

module.exports = {
  login,
  signIn,
  forgetPassword,
  forget,
  resetPassword,
  verifyPassword,
  profile,
  updateProfile,
  notAuthorized,
  logout,
};

async function login(req, res) {
  try {
    // create a super admin user.
    // let password = 'Pioneers@001';
    // let hashedPassword = global.securePassword(password);
    // let obj = { first_name: 'Alicia', last_name: 'Ciera', email: 'alicia@pioneerstutoring.com', password: hashedPassword, role: 4, status: 1, time_zone: 'Australia/Sydney', isDeleted:false  };
    // let userAdded = await User.create(obj);

    if (req.isAuthenticated()) {
      return res.redirect("/dashboard");
    }
    return res.render("../views/auth/login", { layout: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function signIn(req, res) {
  try {
    req.flash("success", "User Login Successfully !");
    return res.json({
      success: true,
      redirectUrl: "/dashboard"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

function forgetPassword(req, res) {
  try {
    return res.render("../views/auth/forget-password", { layout: false });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function forget(req, res) {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      let userName = "";

      if (user.first_name?.trim() || user.last_name?.trim()) {
        userName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
      } else {
        userName = user.company_name;
      }

      const randomString = randomstring.generate();
      const url = global.baseUrl(req) + "/reset-password?token=" + randomString;
      let updated = await User.findByIdAndUpdate(user.id, {
        token: randomString,
      });
      
      const resetLink = global.baseUrl(req) + "/reset-password?token=" + randomString;
      let messageTemplate = await MailTemplates.resetPassword({ token: url,userName:userName,resetLink });
      let mailMessage = messageTemplate.message;
      let mailSubject = messageTemplate.subject;
  
      let mailOptions = {
        from: process.env.APP_EMAIL,
        to: req.body.email,
        subject: mailSubject,
        html: mailMessage,
      };
      let sendmail = await mail.transporter.sendMail(mailOptions);
      req.flash("success", "Mail Sent! Please check your mail");
      res.status(200).json({
        success: true,
        message: "Mail Sent! Please check your mail",
        redirectUrl: "/forget-password",
      });
    } else {
      req.flash("error", "Sorry! User Not Found");
      return res.redirect("/forget-password");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function resetPassword(req, res) {
  try {
    let token = req.query.token;
    return res.render("../views/auth/reset-password", {
      token: token,
      layout: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function verifyPassword(req, res) {
  try {
    let result = req.body.token.trim();
    let hash = global.securePassword(req.body.password);
    if (req.body.password != req.body.confirm_password) {
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
    let tokenData = await User.findOne({ token: result });
    if (tokenData) {
      let updated = await User.findByIdAndUpdate(tokenData.id, {
        password: hash,
        token: "",
      });
      req.flash("success", "Password Changed Successfully");
      res
        .status(200)
        .json({
          success: true,
          message: "Password Changed Successfully!",
          redirectUrl: "/",
        });
    }else{
      req.flash("error", "Sorry! This link has expired. Please request a new password reset link to continue.");
      res
        .status(200)
        .json({
          success: true,
          message: "Sorry! This link has expired. Please request a new password reset link to continue.",
          redirectUrl: "/",
        });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function profile(req, res) {
  try {
    let user = await res.locals.loggedUserInfo;

    let timeZones = await global.timeZoneAustralia();
    return res.render("../views/auth/profile", { data: user, fs: fs,timeZones:timeZones });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function updateProfile(req, res) {
  try {
    let isImpersonating = req.session.isImpersonating;    
    if (req.body.user_id && req.body.user_id != "") {
      let User_details = await User.find({ _id: req.body.user_id });
      if (User_details) {
        
        if (req.body.role == 2) {
          delete req.body.email;
        }
        if (req.file != undefined) {
          userData = User_details[0];
          let profileImage = userData.profile_image;
          const filePath = "./assets/profileImage/" + profileImage;
          req.body.profile_image = req.file.filename;
          if (profileImage != "") {
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
          }
          req.body.profile_image = req.file.filename;
        } else {
          delete req.body.profile_image;
        }
        let updateUser = '';
        if (req.body.password) {
          let hashedPassword = global.securePassword(req.body.password);
          req.body.password = hashedPassword;
          UpdateUser = await User.findByIdAndUpdate(
            req.body.user_id,
            req.body,
            { new: true }
          );
        } else {
          delete req.body.password; // delete password from body if dont want update
          UpdateUser = await User.findByIdAndUpdate(
            req.body.user_id,
            req.body,
            { new: true}
          );
        }
        if(isImpersonating){
          req.session.impersonatedUser = UpdateUser;
          res.locals.loggedUserInfo = UpdateUser;
        }
        req.flash("success", "Profile is updated successfully!");
        res
          .status(200)
          .json({
            success: true,
            message: "Profile is updated successfully!",
            redirectUrl: "/profile",
          });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function notAuthorized(req, res) {
  return res.render("../views/errorPages/_error-403", { layout: false });
}

function logout(req, res) {
  try {
    req.session.destroy(function (err) {
      res.redirect("/"); //Inside a callback… bulletproof!
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}