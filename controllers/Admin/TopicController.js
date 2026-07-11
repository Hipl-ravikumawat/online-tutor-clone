const Topic = require("../../models/Topic");
const SubTopic = require("../../models/SubTopic");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const LearningContent = require("../../models/LearningContent");
const User = require("../../models/User");
const fs = require("fs");
const mysqlOrm = require('mysql-orm');
var slugify = require("slugify");

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  updateStatus,
  destroy,
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
 * list topics.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const topics = await Topic.find({ isDeleted: false }).sort({ _id: -1 });
    const totalTopic = await Topic.find({ role: 2, isDeleted: false })
      .sort({ _id: -1 })
      .count();
    const activeTopic = await Topic.find({ status: 1, isDeleted: false })
      .sort({ _id: -1 })
      .count();
    const deactiveTopic = await Topic.find({ status: 0, isDeleted: false })
      .sort({ _id: -1 })
      .count();

    const topicObject = {
      total: totalTopic,
      active: activeTopic,
      deactive: deactiveTopic,
    };

    return res.render("../views/admin/topics/index", {
      topicObject: topicObject,
      topics: topics,
      moment: res.locals.moment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dataTable
 * @param {*} req
 * @param {*} res
 */
async function dataTable(req, res) {
  try {
    let searchStr = req.body.search.value;
    let obj = {};

    if (req.body.id) {
      obj["_id"] = req.body.id;
    }
    if (req.body.status) {
      obj["status"] = req.body.status;
    }

    if (searchStr) {
      let regex = new RegExp(searchStr, "i");
      searchStr = { $or: [{ name: regex }] };
    } else {
      searchStr = {};
    }

    let filter = ["", "name", "status"];
    let sort = {};

    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      let column_name = filter[req.body.order[0].column];
      let order_by = req.body.order[0].dir;
      sort = { [column_name]: order_by };
    }

    let [recordsTotal, recordsFiltered] = await Promise.all([
      Topic.count({ isDeleted: false }),
      Topic.count({ $and: [searchStr, obj, { isDeleted: false }] }),
    ]);

    let results = await Topic.find(
      { $and: [{ isDeleted: false }, searchStr, obj] },
      "_id topic_image name status slug",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    )
      .sort(sort)
      .exec();

    let data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
    });

    return res.send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    return res.render("../views/admin/topics/create");
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (req.file != undefined) {
      req.body.topic_image = req.file.filename;
    } else {
      req.body.topic_image = "";
    }

    let topic = await Topic.create(req.body);
    req.flash("success", "Topic created successfully!");
    if (topic) {
      res.status(200).json({
        success: true,
        message: "Topic is created successfully!",
        redirectUrl: "/topics",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
}

/**
 * edit topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let slug = req.params.slug;
    let topic = await Topic.findOne({ slug: slug, isDeleted: false });
    if (topic) {
      return res.render("../views/admin/topics/edit", {
        data: topic,
        fs: fs,
      });
    } else {
      return res.status(404).json({
        message: "Topic not found.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    let topicId = req.body.topic_id;

    if (!topicId || topicId.trim() === "") {
      return res.status(400).json({
        message: "Invalid topic ID.",
      });
    } else {
      let topic = await Topic.findOne({
        _id: topicId,
        isDeleted: false,
      });
      if (topic) {
        topicData = topic;
        if (req.file != undefined) {
          let topicImage = topicData.topic_image;
          const filePath = "./assets/TopicImage/" + topicImage;
          if (topicImage != "") {
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
          }
          req.body.topic_image = req.file.filename;
          let topicUpdated = await Topic.findByIdAndUpdate(topicId, req.body);
        } else {
          if (req.body.is_remove == 1) {
            let topicImage = topicData.topic_image;
            const filePath = "./assets/TopicImage/" + topicImage;
            if (topicImage != "") {
              fs.exists(filePath, function (exists) {
                if (exists) {
                  fs.unlinkSync(filePath);
                } else {
                  // console.log('File not found, so not deleting.');
                }
              });
            }

            let TopicUpdated = await Topic.updateOne(
              { _id: topicId },
              {
                $set: {
                  name: req.body.name,
                  topic_image: "",
                  note: req.body.note,
                  status: req.body.status,
                },
              }
            );
          } else {
            let topicUpdated = await Topic.updateOne(
              { _id: topicId },
              {
                $set: {
                  name: req.body.name,
                  note: req.body.note,
                  status: req.body.status,
                },
              }
            );
          }
        }
        req.flash("success", "Topic updated successfully!");
        res.status(200).json({
          success: true,
          message: "Topic is updated successfully!",
          redirectUrl: "/topics",
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
 * update status of a topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      let status = req.body.status == "true" ? "1" : "0";
      let topic = await Topic.findByIdAndUpdate(req.body.uid, {
        status: status,
      });

      res.status(200).json({
        success: true,
        message: "Topic status is updated successfully!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete topic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let topic_id = req.params.id;
    // Check if the grade ID is referenced in any learningContent or tutor or subtopic document.
    let referencedInSubTopic = await SubTopic.find({
      topic_id: mysqlOrm.Types.ObjectId(topic_id),
      isDeleted: false,
    })
      .limit(1)
      .count();

    if (referencedInSubTopic) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/topics",
        message:
          "This topic is currently enrolled in a subtopic and cannot be deleted at this time.",
      });
    }

    let referencedInLearningContent = await LearningContent.find({
      deleted_at: null,
      topic_id: mysqlOrm.Types.ObjectId(topic_id),
    })
      .limit(1)
      .count();

    if (referencedInLearningContent) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/topics",
        message:
          "This topic is currently enrolled in a learning content and cannot be deleted at this time.",
      });
    }

    let referencedInTutor = await User.find({
      isDeleted: false,
      role: 2,
      subject_ids: mysqlOrm.Types.ObjectId(topic_id),
    })
      .limit(1)
      .count();

    if (referencedInTutor) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/topics",
        message:
          "This topic is currently enrolled in a tutor and cannot be deleted at this time.",
      });
    }

    let referencedInTutorTrainingContent = await TutorTrainingContent.find({
      deleted_at: null,
      topic_id: mysqlOrm.Types.ObjectId(topic_id),
    })
      .limit(1)
      .count();

    if (referencedInTutorTrainingContent) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/topics",
        message:
          "This topic is currently enrolled in a training content and cannot be deleted at this time.",
      });
    }

    let topicUpdates = { isDeleted: true, deleted_at: new Date() };
    let topicDeleted = await Topic.findOneAndUpdate(
      { _id: topic_id },
      topicUpdates,
      {
        new: true,
      }
    );
    if (topicDeleted) {
      //   let topicImage = topicDeleted.topic_image;
      //   if (topicImage != "") {
      // const filePath = "./assets/TopicImage/" + topicImage;
      // fs.exists(filePath, function (exists) {
      //   if (exists) {
      //     fs.unlinkSync(filePath);
      //   } else {
      //     console.log("File not found, so not deleted.");
      //   }
      // });

      req.flash("success", "Topic is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/topics",
        message: "Topic is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/topics",
        message: "Topic not found or already deleted.",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      redirectUrl: "/topics",
      message: "Something went wrong, please try again later.",
    });
  }
}
