const mysqlOrm = require('mysql-orm');
const EventLocation = require("../../models/EventLocation");
const Event = require("../../models/Event");

module.exports = {
  store,
  edit,
  destroy,
};

/**
 * store event location.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    const locationId = req.body.location_id;
    if (locationId !== "") {
      let location = await EventLocation.findByIdAndUpdate(
        locationId,
        req.body
      );
      if (location) {
        req.flash("success", "The Location is updated successfully!");
        res
          .status(200)
          .json({
            success: true,
            message: "The Location is updated successfully!",
            redirectUrl: "/calendar/preferences",
          });
      } else {
        req.flash("error", "Sorry! Category is not updated");
        res
          .status(200)
          .json({
            success: false,
            message: "Sorry! Category is not updated",
            redirectUrl: "/calendar/preferences",
          });
      }
    } else {
      let location = await EventLocation.create(req.body);
      if (location) {
        req.flash("success", "The Location is added successfully!");
        res
          .status(200)
          .json({
            success: true,
            message: "The Location is added successfully!",
            redirectUrl: "",
          });
      } else {
        req.flash("error", "Sorry! Category is not added");
        res
          .status(200)
          .json({
            success: false,
            message: "Sorry! Category is not added is not added",
            redirectUrl: "",
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

/**
 * edit event location.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let location = await EventLocation.findById(req.body.location_id);
    res.send(location);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete event location.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let isLocationAttachedWithEvents = await Event.find({event_location_id: mysqlOrm.Types.ObjectId(req.params.id)});
    if(isLocationAttachedWithEvents.length == 0 ){
        await EventLocation.findByIdAndUpdate(req.params.id, { isDeleted: true });
        req.flash("success", "The Location deleted successfully!");
        res
          .status(200)
          .json({
            success: true,
            message: "The Location deleted successfully",
            redirectUrl: "page-reload",
          });
    }else{
      res
      .status(200)
      .json({
        success: false,
        message: "Sorry! Can not deleted , Location is attached with events",
        redirectUrl: "page-reload",
      });
    }
   
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}