const mysqlOrm = require('mysql-orm');
const User = require("../../models/User");
const TutorLeave = require("../../models/TutorLeave");

module.exports = {
    index,
    store,
    edit,
    update,
    leaveApproval,
    destroy
};

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
async function store(req, res) {
    try {
        const { start_date, end_date, leave_request_id } = req.body;

        const tutor_id = res.locals.loggedUserInfo._id.toString();
        req.body.tutor_id = tutor_id;
   
        if (leave_request_id && mysqlOrm.Types.ObjectId.isValid(leave_request_id)) {
            const result = await TutorLeave.findByIdAndUpdate(leave_request_id, req.body, { new: true });
            if (result) {
                req.flash('success', 'Tutor leave request updated successfully.');
                return res.status(200).json({ success: true, message: 'Tutor leave request updated successfully.' });
            } else {
                req.flash('error', 'Failed to update tutor leave request.');
                return res.status(404).json({ success: false, message: 'Failed to update tutor leave request.' });
            }
        } else {
            const result = await TutorLeave.create(req.body);
            if (result) {
                const tutor = await User.findById(tutor_id);
                if (!tutor) {
                    req.flash('error', 'Tutor not found.');
                    return res.status(404).json({ success: false, message: 'Tutor not found.' });
                }

                await User.findByIdAndUpdate(tutor_id, {
                $addToSet: { leave_request_ids: result._id }
                });
                req.flash('success', 'Tutor leave request created successfully.');
                return res.status(200).json({ success: true, message: 'Tutor leave request created successfully.' });
            } else {
                req.flash('error', 'Sorry! Tutor leave request not added!');
                return res.status(500).json({ success: false, message: 'Sorry! Tutor leave request not added.' });
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

        if (!id) {
            return res.status(400).json({
                message: "Leave Request ID is required.",
            });
        }

        const leaveRequestData = await TutorLeave.findById(id);
        if (!leaveRequestData) {
            return res.status(404).json({
                success: false,
                message: "Tutor leave request not found.",
            });
        }

        return res.status(200).json({
            ...leaveRequestData.toObject(),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * leaveApproval
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function leaveApproval(req, res) {
    try {
        const { leave_request_id, leave_request_status } = req.body;

        if (!leave_request_id || leave_request_status === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: leave_request_id or leave_request_status.",
            });
        }

        const result = await TutorLeave.findByIdAndUpdate(
            leave_request_id,
            { isApproved: leave_request_status },
            { new: true } // To return the updated document
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Tutor Leave Request not found.",
            });
        }

        req.flash("success", "Tutor Leave Request status updated successfully.");
        return res.status(200).json({
            success: true,
            message: "Tutor Leave Request status updated successfully.",
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

        const leaveRequestData = await TutorLeave.findById(id);
        if (!leaveRequestData) {
            return res.status(404).json({
                success: false,
                message: "Tutor Leave Request not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tutor Leave Request data retrieved successfully.",
            data: leaveRequestData,
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
        const { leaveRequestId } = req.params;
        const loggedUserId = res.locals.loggedUserInfo._id.toString();


        if (!leaveRequestId || !mysqlOrm.Types.ObjectId.isValid(leaveRequestId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing Leave Request ID.",
            });
        }

        const leaveRequestObjectId = mysqlOrm.Types.ObjectId(leaveRequestId);
        const tutor = await User.findById(loggedUserId);
        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found.",
            });
        }

        if (!tutor.leave_request_ids.includes(leaveRequestObjectId)) {
            return res.status(400).json({
                success: false,
                message: "Tutor Leave Request ID is not associated with this tutor.",
            });
        }

        const leaveRequestData = await TutorLeave.findById(leaveRequestObjectId);

        if (!leaveRequestData) {
            return res.status(404).json({
                success: false,
                message: "Tutor Leave Request not found.",
            });
        }

        const deletionResult = await TutorLeave.findByIdAndUpdate(
            leaveRequestObjectId,
            { isDeleted: true, deleted_at: new Date() },
            { new: true }
        );

        if (!deletionResult) {
            return res.status(400).json({
                success: false,
                message: "Failed to delete Tutor Leave Request.",
            });
        }

        await User.updateOne(
            { _id: tutor._id },
            { $pull: { leave_request_ids: leaveRequestObjectId } }
        );

        return res.status(200).json({
            success: true,
            message: "Tutor Leave Request deleted successfully!",
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