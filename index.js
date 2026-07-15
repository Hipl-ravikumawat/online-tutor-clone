const express = require('express');
const port = 8001;
const env = require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const session = require('express-session');
const passport = require('passport');
const MySQLStore = require('express-mysql-session')(session);
const flash = require("connect-flash");
const moment = require('moment');
const passportLocal = require('./config/passport-local-strategy');
const mysqlOrm = require('mysql-orm');
// const appDbSeeder = require('./seeders/appDbSeeder');  // Import the seeder script
const customMware = require('./config/middleware');
const app = express();
const path = require('path');


mysqlOrm.set('strictQuery', false);

const { initCrons } = require("./cron/index");

initCrons();

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(expressLayouts);
app.use(express.static('./assets'));

// extract style and scripts from sub pages into the layout
app.set('layout extractStyles', true);
app.set('layout extractScripts', true);

// set up the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(session({
    // TODO change the secret before deployment in production mode
    name: 'pioneerslearninghub',
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: false,
    cookie: {
        // maxAge: (8 * 60 * 60 * 1000), // 8 hours in milliseconds
        // secure: false
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        secure: process.env.APP_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'

    },
    store: new MySQLStore({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'online_tutor',
        createDatabaseTable: true,
        schema: { tableName: 'user_sessions' }
    })
}));

app.use('/reports', express.static(path.join(__dirname, './assets/AttendanceReports')));

app.use(passport.initialize());
app.use(passport.session());
app.use(passport.setAuthenticatedUser);

app.use(flash());

app.use([
    customMware.setFlash,
    customMware.dateFormate,
    customMware.loggedInUserDetails,
    customMware.preventBackButton,
]);

// use express router
app.use('/', require('./routes'));
app.listen(port, "127.0.0.1", function (err) {
    if (err) {
        console.log(`Error in running the server: ${err}`);
    }
    // appDbSeeder();
    console.log(`Server is running on port: ${port}`);
});
