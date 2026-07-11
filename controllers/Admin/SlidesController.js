const mysqlOrm = require('mysql-orm');
const fs = require("fs");
var slugify = require("slugify");
const Lesson = require("../../models/Lesson");
const Slide = require("../../models/Slide");

module.exports = {
  storeSlide,
  editSlide,
  destroySlide,
  duplicateSlide,
  updateSlidePosition,
};

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: false, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

/**
 * store Or update a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function storeSlide(req, res) {
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
      const slide = await Slide.findById(req.body.slide_id);

      if (!slide) {
        return res
          .status(404)
          .json({ success: false, message: "Slide not found!" });
      }

      const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
      const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

      if ((req.body.video || req.body.is_video_remove === "1") && isValidVideo) {
        const filePath = `./assets/LearningContent/${req.body.content_directory}/${slide.video}`;
        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.unlinkSync(filePath);
          } else {
            console.log("The file not found, so not deleted.");
          }
        });
      }

      if ((req.body.attachments || req.body.is_attachment_remove === "1") && isValidAttachment) {
        const filePath = `./assets/LearningContent/${slide.content_directory}/${slide.attachments[0]}`;
        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.unlinkSync(filePath);
          } else {
            console.log("The file not found, so not deleted.");
          }
        });
      }

      await Slide.findByIdAndUpdate(req.body.slide_id, req.body);
      let crudMessage = "Slide is updated successfully!";
      req.flash("success", crudMessage);
      res.status(200).json({ success: true, message: crudMessage });
    } else {
      // Find lesson and assign slides
      const lesson = await Lesson.findOne({
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
      const newSlide = await Slide.create(req.body);
      await Lesson.findByIdAndUpdate(lessonId, {
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
 * edit slide form.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function editSlide(req, res) {
  try {
    const slideId = req.body.slide_id;
    const slide = await Slide.findById(slideId);
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete a slide.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroySlide(req, res) {
  try {
    let requestSegments = req.originalUrl.split("/");
    let lessonSlug = requestSegments[4];
    let slideId = mysqlOrm.Types.ObjectId(req.params.slideId);

    const slide = await Slide.findById(req.params.slideId);
    if (!slide) {
      return res
        .status(404)
        .json({ success: false, message: "Slide not found!" });
    }

    const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
    const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

    // delete slide media
    if (isValidVideo) {
      const filePath = `./assets/LearningContent/${slide.content_directory}/${slide.video}`;
      fs.exists(filePath, function (exists) {
        if (exists) {
          fs.unlinkSync(filePath);
        } else {
          console.log("The file not found, so not deleted.");
        }
      });
    }

    if (isValidAttachment) {
      const filePath = `./assets/LearningContent/${slide.content_directory}/${slide.attachments[0]}`;
      fs.exists(filePath, function (exists) {
        if (exists) {
          fs.unlinkSync(filePath);
        } else {
          console.log("The file not found, so not deleted.");
        }
      });
    }

    await Slide.findByIdAndDelete(req.params.slideId);
    await Lesson.updateOne(
      { slug: lessonSlug },
      { $pull: { slide_ids: slideId } }
    );

    let crudMessage = "Slide is deleted successfully!";
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
    let newattachment = '';
    let video = '';

    const slide = await Slide.findById(slideId);
    const contentDirectory = slide.content_directory;

    const isValidVideo = typeof slide.video === 'string' && slide.video.trim() !== '';
    const isValidAttachment = typeof slide.attachments[0] === 'string' && slide.attachments[0].trim() !== '';

    if (isValidVideo) {
      let videoName = slide.video.split("-");
      videoName[0] = Date.now();
      video = videoName.join("-");
      fs.copyFile(
        `./assets/LearningContent/${contentDirectory}/${slide.video}`,
        `./assets/LearningContent/${contentDirectory}/${video}`,
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
        `./assets/LearningContent/${contentDirectory}/${slide.attachments[0]}`,
        `./assets/LearningContent/${contentDirectory}/${newAttachment}`,
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
      attachments: newattachment,
      content_directory: slide.content_directory,
    };

    duplicatedSlide = await Slide.create(Obj);
    await Lesson.findByIdAndUpdate(lessonId, {$push: { slide_ids: duplicatedSlide._id }});

    let crudMessage = "Slide is duplicated successfully!";
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
        await Slide.findByIdAndUpdate(position[0], {
          position: position[1],
        });
      }
      let crudMessage = "Slide is reordered successfully!";
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