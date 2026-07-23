const mysqlOrm = require('mysql-orm');
const moment = require('moment-timezone');
const User = require("../../models/User");
const TutorAvailability = require("../../models/TutorAvailability");
const { findById } = require("../../models/Assessment");

module.exports = {
    index,
    store,
    edit,
    update,
    availabilityApproval,
    destroy
};

/**
 * Optimized conflict check for tutor availability
 * @param {string} tutorId - Tutor ID
 * @param {number} newStartTime - New availability start timestamp
 * @param {number} newEndTime - New availability end timestamp  
 * @param {string|null} excludeId - Availability ID to exclude (for updates)
 * @returns {Promise<boolean>} - Returns true if conflict exists
 */

function hasDateOverlap(start1, end1, start2, end2) {
    return start1 <= end2 && end1 >= start2;
}

function hasTimeOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
}

function getMinutes(timestamp, timeZone) {
    const m = moment.unix(timestamp).tz(timeZone);
    return m.hours() * 60 + m.minutes();
}


async function checkAvailabilityConflict(
    tutorId,
    newStartTime,
    newEndTime,
    selectedDays,
    timeZone,
    excludeId = null
) {
    try {

        const query = {
            tutor_id: tutorId,
            isDeleted: false
        };

        if (excludeId && mysqlOrm.Types.ObjectId.isValid(excludeId)) {
            query._id = { $ne: new mysqlOrm.Types.ObjectId(excludeId) };
        }

        const availabilities = await TutorAvailability.find(query).lean();

        const newStartDate = moment
            .unix(newStartTime)
            .tz(timeZone)
            .startOf("day")
            .unix();

        const newEndDate = moment
            .unix(newEndTime)
            .tz(timeZone)
            .endOf("day")
            .unix();

        const newStartMinutes = getMinutes(newStartTime, timeZone);
        const newEndMinutes = getMinutes(newEndTime, timeZone);

        const selectedDaysString = selectedDays.map(String);
        
        for (const slot of availabilities) {

            const oldStartDate = moment
                .unix(slot.start_date_time)
                .tz(timeZone)
                .startOf("day")
                .unix();

            const oldEndDate = moment
                .unix(slot.end_date_time)
                .tz(timeZone)
                .endOf("day")
                .unix();

                
            // Date overlap
            if (!hasDateOverlap(
                newStartDate,
                newEndDate,
                oldStartDate,
                oldEndDate
            )) {
                continue;
            }

            // Day overlap
            const commonDay = (slot.days || []).some(day =>
                selectedDaysString.includes(String(day))
            );

            if (!commonDay) {
                continue;
            }

            const oldStartMinutes = getMinutes(
                slot.start_date_time,
                timeZone
            );

            const oldEndMinutes = getMinutes(
                slot.end_date_time,
                timeZone
            );

            // Time overlap
            if (
                hasTimeOverlap(
                    newStartMinutes,
                    newEndMinutes,
                    oldStartMinutes,
                    oldEndMinutes
                )
            ) {
                return true;
            }
        }

        return false;

    } catch (err) {
        console.error(err);
        return false;
    }
}


/**
 * index
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function index(req, res) {
    try {
        return res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * store
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */

const formatDate = (date) => {
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}`;
};

async function store(req, res) {
    try {
        const { start_date, start_time, end_date, end_time, availability_id } = req.body;

        const tutor_id = res.locals.loggedUserInfo._id.toString();
        req.body.tutor_id = tutor_id;
        const timeZone = res.locals.loggedUserInfo.time_zone;
        const startDateTimeStr = `${formatDate(start_date)} ${start_time}`;
        const endDateTimeStr = `${formatDate(end_date)} ${end_time}`;

        const start_date_time =  convertInTimeStamp(startDateTimeStr, timeZone);
        const end_date_time =  convertInTimeStamp(endDateTimeStr, timeZone);

        if (isNaN(start_date_time) || isNaN(end_date_time)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date/time conversion"
            });
        }

        req.body.start_date_time = start_date_time;
        req.body.end_date_time = end_date_time;

        if (Array.isArray(req.body.days)) {
            req.body.days = Array.from(new Set(req.body.days.map(String)));
        }

        const conflict = await checkAvailabilityConflict(
            tutor_id,
            start_date_time,
            end_date_time,
            req.body.days,
            timeZone,
            availability_id || null
        );

        if (conflict) {
           // req.flash('error', 'Time conflict detected! This availability slot overlaps with an existing availability period.');
            return res.status(409).json({
                success: false,
                message: "Time conflict detected! This availability slot overlaps with an existing availability period."
            });
        }

        if (availability_id !== '') {
            const availabilityRecord = await TutorAvailability.findById(availability_id).lean();
            
            if(availabilityRecord && availabilityRecord.isApproved === "3"){
                req.body.isApproved = 1;
            }
            const result = await TutorAvailability.findByIdAndUpdate(availability_id, req.body, { new: true });
            if (result) {
                req.flash('success', 'Tutor availability updated successfully.');
                return res.status(200).json({ success: true, message: 'Tutor availability updated successfully.' });
            } else {
                req.flash('error', 'Failed to update tutor availability.');
                return res.status(404).json({ success: false, message: 'Failed to update tutor availability.' });
            }
        } else {
            const result = await TutorAvailability.create(req.body);
            if (result) {
                const tutor = await User.findById(tutor_id);
                if (!tutor) {
                    req.flash('error', 'Tutor not found.');
                    return res.status(404).json({ success: false, message: 'Tutor not found.' });
                }

                let tutorAvailability = tutor.availability_id || [];
                tutorAvailability.push(result.id);
                await User.findByIdAndUpdate(tutor_id, { availability_id: tutorAvailability });
                req.flash('success', 'Tutor availability created successfully.');
                return res.status(200).json({ success: true, message: 'Tutor availability created successfully.' });
            } else {
                req.flash('error', 'Sorry! Tutor Availability not added!');
                return res.status(500).json({ success: false, message: 'Sorry! Tutor availability not added.' });
            }
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Something went wrong, please try again later.' });
    }
}

/**
 * edit
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function edit(req, res) {
    try {
        const { id } = req.body;
        const { moment } = res.locals;

        if (!id) {
            return res.status(400).json({
                message: "Availability ID is required.",
            });
        }

        const availabilityData = await TutorAvailability.findById(id);
        if (!availabilityData) {
            return res.status(404).json({
                message: "Tutor availability not found.",
            });
        }

        const userTimeZone = res.locals.loggedUserInfo.time_zone;
        const startDate = moment.unix(availabilityData.start_date_time).tz(userTimeZone).format('DD-MM-YYYY');
        const startTime = moment.unix(availabilityData.start_date_time).tz(userTimeZone).format('hh:mm A');
        const endDate = moment.unix(availabilityData.end_date_time).tz(userTimeZone).format('DD-MM-YYYY');
        const endTime = moment.unix(availabilityData.end_date_time).tz(userTimeZone).format('hh:mm A');

        return res.status(200).json({
            ...availabilityData.toObject(),
            start_date: startDate,
            start_time: startTime,
            end_date: endDate,
            end_time: endTime
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * availabilityApproval
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function availabilityApproval(req, res) {
    try {
        const { availability_id, availability_status } = req.body;

        if (!availability_id || availability_status === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: availability_id or availability_status.",
            });
        }

        const result = await TutorAvailability.findByIdAndUpdate(
            availability_id,
            { isApproved: availability_status },
            { new: true } // To return the updated document
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Tutor Availability not found.",
            });
        }

        req.flash("success", "Tutor Availability status updated successfully.");
        return res.status(200).json({
            success: true,
            message: "Tutor Availability status updated successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * update
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function update(req, res) {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Availability ID is required.",
            });
        }

        const availabilityData = await TutorAvailability.findById(id);
        if (!availabilityData) {
            return res.status(404).json({
                success: false,
                message: "Tutor Availability not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tutor Availability data retrieved successfully.",
            data: availabilityData,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * destroy
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function destroy(req, res) {
    try {
        const { availabilityId } = req.params;
        const loggedUserId = res.locals.loggedUserInfo._id.toString();

        if (!availabilityId || !mysqlOrm.Types.ObjectId.isValid(availabilityId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing Availability ID.",
            });
        }

        const availabilityObjectId = mysqlOrm.Types.ObjectId(availabilityId);
        const tutor = await User.findById(loggedUserId);
        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found.",
            });
        }

        if (!tutor.availability_id.includes(availabilityObjectId)) {
            return res.status(400).json({
                success: false,
                message: "Tutor Availability ID is not associated with this tutor.",
            });
        }

        const availabilityData = await TutorAvailability.findById(availabilityObjectId);

        if (!availabilityData) {
            return res.status(404).json({
                success: false,
                message: "Tutor Availability not found.",
            });
        }

        const deletionResult = await TutorAvailability.findByIdAndUpdate(
            availabilityObjectId,
            { isDeleted: true, deleted_at: new Date() },
            { new: true } // Option to return the updated document
        );

        if (!deletionResult) {
            return res.status(400).json({
                success: false,
                message: "Failed to delete Tutor Availability.",
            });
        }

        await User.updateOne(
            { _id: tutor._id },
            { $pull: { availability_id: availabilityObjectId } }
        );

        return res.status(200).json({
            success: true,
            message: "Tutor Availability deleted successfully!",
            redirectUrl: "page-reload"
        });
    } catch (error) {
        console.error("Error during deletion:", error); // Log the error with more details
        return res.status(500).json({
            success: false,
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * convertInTimeStamp
 * @param {*} date 
 * @param {*} timeZone 
 * @returns 
 */
// async function convertInTimeStamp(date, timeZone) {
//     try {
//         if (!date || !timeZone) {
//             throw new Error('Both date and timeZone are required.');
//         }
//         const DateTimeInLocalZone = moment.tz(date, 'MM/DD/YYYY hh:mm a', timeZone);
//         const DateTimeUTC = DateTimeInLocalZone.clone().utc(); // Clone to keep original date-time
//         const DateTimeUTCUnix = DateTimeUTC.unix(); // Unix timestamp
//         return DateTimeUTCUnix;
//     } catch (error) {
//         console.error('Error in convertInTimeStamp:', error.message);
//         throw new Error('Failed to convert date to timestamp. Please check input values.');
//     }
// }

const convertInTimeStamp = (dateTimeStr, timeZone) => {
    const m = moment.tz(dateTimeStr, "YYYY-MM-DD hh:mm A", timeZone);

    if (!m.isValid()) {
        return NaN;
    }

    return m.unix(); // seconds (matches your frontend usage)
};
