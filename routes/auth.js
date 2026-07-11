const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const multer = require('multer');

const authController = require('../controllers/Auth/AuthController')
var authRequest = require('../requests/Auth/ResetPassword');
var forgotRequest = require('../requests/Auth/ForgotPassword');
var updateProfileRequest = require('../requests/Auth/UpdateProfileRequest');

const storageProfileImg = multer.diskStorage({
    destination: (req, file, callback) => {
        const dir = './assets/ProfileImage/';
        if (!fs.existsSync(dir)) {
            fs.mkdir(dir, err => callback(err, dir));
        }
        callback(null, dir);
    },
    filename: (req, file, callback) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        const newFileName = Date.now() + fileName;
        callback(null, newFileName);
    }
});

var uploadProfileImgImage = multer({
    storage: storageProfileImg,
    fileFilter: (req, file, callback) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            callback(null, true);
        }
        else {
            callback(null, false);
            return res.status(422).json({ errors: [{ msg: 'Only .png, .jpg and .jpeg format allowed!' }] });
        }
    }
});

router.get('/', authController.login);
router.get('/profile', passport.checkAuthentication, authController.profile);
router.post('/updateProfile', passport.checkAuthentication, uploadProfileImgImage.single('profile_image'), updateProfileRequest, authController.updateProfile);
router.get('/logout', authController.logout);
router.get('/forget-password', authController.forgetPassword);
router.post('/forget', forgotRequest, authController.forget);
router.get('/reset-password', authController.resetPassword);
router.post('/verify-password', authRequest, authController.verifyPassword);
router.get('/not-authorized', authController.notAuthorized);
router.post('/sign-in', passport.authenticate('local', { failureRedirect: '/', failureFlash: true },), authController.signIn);

module.exports = router;
