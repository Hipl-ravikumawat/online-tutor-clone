const mysqlOrm = require('mysql-orm');
const fs = require("fs");
var slugify = require("slugify");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");
const TutorTrainingLesson = require("../../models/TutorTrainingLesson");
const TutorTrainingSlide = require("../../models/TutorTrainingSlide");

module.exports = {
  store,
  edit,
  destroy,
  duplicateSlide,
  updateSlidePosition,
};

/**
 * store Or update a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    let fileName = req.files;
    const lessonId = req.body.lesson_id;
    const object = {};
    delete req.body.lessonId;
    req.body.video = req.body.attachments = "";

    for (file of fileName) {
      if (file.fieldname == "video") {
        req.body.video =
          typeof file.filename != "undefined" ? file.filename : "";
        object["slides.$.video"] = file.filename;
      }
      if (file.fieldname == "attachments") {
        req.body.attachments =
          typeof file.filename != "undefined" ? file.filename : "";
        object["slides.$.attachments"] = file.filename;
      }
    }

    if (req.body.video == "" && req.body.is_video_remove == 0) {
      delete req.body.video;
    }

    if (req.body.attachments == "" && req.body.is_attachment_remove == 0) {
      delete req.body.attachments;
    }

    // if slide id exist then update
    if (req.body.slide_id !== "") {
      // const isAttachedInAssessment = await TutorTrainingAssessment.find({
      //   "content.lessons": {
      //     $elemMatch: {
      //       "slide_ids": { $in: [mysqlOrm.Types.ObjectId(req.body.slide_id)] }
      //     }
      //   }
      // }).limit(1).count();

      let crudMessage = "Slide is updated successfully!";
      // if(isAttachedInAssessment){
      //   crudMessage = "Slide updated successfully! Please remember that this slide is attached to a training assessment!";
          // return res
          // .status(500)
          // .json({ success: false, message: "This slide is enrolled in a training assessment, So it can't be updated."});
      // }

      const slide = await TutorTrainingSlide.findById(req.body.slide_id);
      if (!slide) {
        return res
          .status(404)
          .json({ success: false, message: "Slide not found!" });
      }

      const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
      const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

      if ((req.body.video || req.body.is_video_remove === "1") && isValidVideo) {
        const filePath = `./assets/TutorTrainingContent/${req.body.content_directory}/${slide.video}`;
        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.unlinkSync(filePath);
          } else {
            console.log("The file not found, so not deleted.");
          }
        });
      }
      
      if ((req.body.attachments || req.body.is_attachment_remove === "1") && isValidAttachment) {
        const filePath = `./assets/TutorTrainingContent/${slide.content_directory}/${slide.attachments[0]}`;
        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.unlinkSync(filePath);
          } else {
            console.log("The file not found, so not deleted.");
          }
        });
      }

      await TutorTrainingSlide.findByIdAndUpdate(req.body.slide_id, req.body);
      req.flash("success", crudMessage);
      res.status(200).json({ success: true, message: crudMessage });
    } else {
      // Find lesson and assign slides
      const lesson = await TutorTrainingLesson.findOne({
        _id: mysqlOrm.Types.ObjectId(lessonId),
      }).populate("slide_ids");
      if (!lesson) {
        return res
          .status(404)
          .json({ success: false, message: "Lesson not found!" });
      }

      const slides = lesson.slide_ids;
      let temp_pos = 0;
      if (slides.length === 0) {
        temp_pos = 1;
      } else {
        let maxPosition = slides.reduce((a, b) =>
          a.position > b.position ? a : b
        ).position;
        temp_pos = maxPosition + 1;
      }

      req.body.position = temp_pos;
      const newSlide = await TutorTrainingSlide.create(req.body);
      await TutorTrainingLesson.findByIdAndUpdate(lessonId, {
        $push: { slide_ids: newSlide._id },
      });
      let crudMessage = "Slide created successfully!";
      req.flash("success", crudMessage);
      res.status(201).json({ success: true, message: crudMessage });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit Or update a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    const slideId = req.body.slide_id;
    const slide = await TutorTrainingSlide.findById(slideId);
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * destroy Or update a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const requestSegments = req.originalUrl.split("/");
    const lessonSlug = requestSegments[4];
    const slideId = mysqlOrm.Types.ObjectId(req.params.slideId);

    const slide = await TutorTrainingSlide.findById(req.params.slideId);

    if (!slide) {
      return res
        .status(404)
        .json({ success: false, message: "Slide not found!" });
    }

    // const isAttachedInAssessment = await TutorTrainingAssessment.find({
    //   "content.lessons": {
    //     $elemMatch: {
    //       "slide_ids": { $in: [mysqlOrm.Types.ObjectId(req.body.slide_id)] }
    //     }
    //   }
    // }).limit(1).count();

    // if(isAttachedInAssessment){
    //      return res
    //     .status(500)
    //     .json({ success: false, message: "This slide is enrolled in a training assessment, So it can't be updated."});
    // }

    const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
    const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

    if (isValidVideo) {
      const filePath = `./assets/TutorTrainingContent/${slide.content_directory}/${slide.video}`;
      fs.exists(filePath, function (exists) {
        if (exists) {
          fs.unlinkSync(filePath);
        } else {
          console.log("The file not found, so not deleted.");
        }
      });
    }

    if (isValidAttachment) {
      const filePath = `./assets/TutorTrainingContent/${slide.content_directory}/${slide.attachments[0]}`;
      fs.exists(filePath, function (exists) {
        if (exists) {
          fs.unlinkSync(filePath);
        } else {
          console.log("The file not found, so not deleted.");
        }
      });
    }
    
    await TutorTrainingSlide.findByIdAndDelete(req.params.slideId);
    await TutorTrainingLesson.updateOne(
      { slug: lessonSlug },
      { $pull: { slide_ids: slideId } }
    );

    let crudMessage = "The slide is deleted successfully!";
    req.flash("success", crudMessage);
    return res.status(200).json({
      success: true,
      redirectUrl: "page-reload",
      message: crudMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * duplicate a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function duplicateSlide(req, res) {
  try {
    let lessonId = req.body.lessonId;
    let slideId = req.body.id;
    let newAttachment = "";
    let video = "";
  
    const slide = await TutorTrainingSlide.findById(slideId);
    const contentDirectory = slide.content_directory;

    const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
    const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

    if (isValidVideo) {
      let videoName = slide.video.split("-");
      videoName[0] = Date.now();
      video = videoName.join("-");
      fs.copyFile(
        `./assets/TutorTrainingContent/${contentDirectory}/${slide.video}`,
        `./assets/TutorTrainingContent/${contentDirectory}/${video}`,
        (err) => {
          if (err) throw err;
        }
      );
    }
  
    if (isValidAttachment) {
      let attachment = slide.attachments[0].split("-");
      attachment[0] = Date.now();
      newAttachment = attachment.join("-");

      fs.copyFile(
        `./assets/TutorTrainingContent/${contentDirectory}/${slide.attachments[0]}`,
        `./assets/TutorTrainingContent/${contentDirectory}/${newAttachment}`,
        (err) => {
          if (err) throw err;
        }
      );
    }

    const Obj = {
      title: slide.title,
      duration: slide.duration,
      description: slide.description,
      video_url: slide.video_url,
      video: video,
      attachments: newAttachment,
      content_directory: slide.content_directory,
    };

    duplicatedSlide = await TutorTrainingSlide.create(Obj);

    await TutorTrainingLesson.findByIdAndUpdate(lessonId, {
      $push: { slide_ids: duplicatedSlide._id },
    });

    let crudMessage = "The slide is duplicated successfully!";
    req.flash("success", crudMessage);
    return res.status(200).json({
      success: true,
      redirectUrl: "",
      message: crudMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update a slide position.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateSlidePosition(req, res) {
  try {
    let positions = req.body.positions;
    if (positions.length > 0) {
      for (position of positions) {
        await TutorTrainingSlide.findByIdAndUpdate(position[0], {
          position: position[1],
        });
      }
      
      let crudMessage = "The slide is reordered successfully!";
      req.flash("success", crudMessage);
      res.status(200).json({ success: true, message: crudMessage });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Something went wrong." });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}