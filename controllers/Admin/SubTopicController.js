const SubTopic = require("../../models/SubTopic");
const Topic = require("../../models/Topic");
const LearningContent = require("../../models/LearningContent");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const mysqlOrm = require('mysql-orm');
const fs = require("fs");

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
  updateStatus,
  renderSubTopics,
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
 * list subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const [activeTopic, subTopic] = await Promise.all([
      Topic.find({ status: 1, isDeleted: false }).sort({ name: 1 }),
      SubTopic.find({ isDeleted: false })
        .populate({
          path: "topic_id",
          match: { isDeleted: false },
        })
        .sort({ name: 1 }),
    ]);
    const totalSubTopic = await SubTopic.find({ isDeleted: false })
      .sort({ name: 1 })
      .count();
    const activeSubTopic = await SubTopic.find({ isDeleted: false, status: 1 })
      .sort({ name: 1 })
      .count();
    const deactiveSubTopic = await SubTopic.find({
      isDeleted: false,
      status: 0,
    })
      .sort({ name: 1 })
      .count();

    // Check if subTopicStats exists and has data before accessing its properties
    const subTopicObject = {
      total: totalSubTopic,
      active: activeSubTopic,
      deactive: deactiveSubTopic,
    };
    return res.render("../views/admin/subTopics/index", {
      data: subTopic,
      topics: activeTopic,
      subTopicObject: subTopicObject,
      fs: fs,
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

    if (req.body.sub_topic) {
      obj["_id"] = mysqlOrm.Types.ObjectId(req.body.sub_topic);
    }

    if (req.body.main_topic) {
      obj["topic_id"] = mysqlOrm.Types.ObjectId(req.body.main_topic);
    }

    if (req.body.status) {
      obj["status"] = Number(req.body.status);
    }

    if (searchStr) {
      searchStr = new RegExp(searchStr, "i");
      searchStr = { $or: [{ name: searchStr }] };
    } else {
      searchStr = {};
    }

    const filter = ["topic_id", "name", "status"];
    const column_name = filter[req.body.order[0].column];
    const order_by = req.body.order[0].dir;

    let [recordsTotal, recordsFiltered] = await Promise.all([
      SubTopic.count({ isDeleted: false }),
      SubTopic.count({ $and: [searchStr, obj, { isDeleted: false }] }),
    ]);

    // Build the aggregation pipeline
    let aggregationPipeline = [
      { $match: { $and: [obj, searchStr, { isDeleted: false }] } },
      {
        $lookup: {
          from: "topics",
          localField: "topic_id",
          foreignField: "_id",
          as: "topic_details",
        },
      },
      { $unwind: { path: "$topic_details", preserveNullAndEmptyArrays: true } },
    ];


    let sortQuery = {};
    if (column_name === "topic_id") {
      sortQuery["topic_details.name"] = order_by === "asc" ? 1 : -1;
    } else {
      sortQuery[column_name] = order_by === "asc" ? 1 : -1;
    }

    aggregationPipeline.push({ $sort: sortQuery });

    aggregationPipeline.push(
      { $skip: Number(req.body.start) },
      { $limit: Number(req.body.length) }
    );

    let results = await SubTopic.aggregate(aggregationPipeline);

    // let results = await SubTopic.find(
    //   { $and: [obj, searchStr, { isDeleted: false }] },
    //   "_id  name topic_id status slug",
    //   { skip: Number(req.body.start), limit: Number(req.body.length) }
    // )
    //   .populate("topic_id")
    //   .sort(sortQuery);

    var data = JSON.stringify({
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
 * create subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    const activeTopic = await Topic.find({ status: 1, isDeleted: false }).sort({name: 1});
    return res.render("../views/admin/subTopics/create", { data: activeTopic });
  } catch (e) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    let subTopic = await SubTopic.create(req.body);
    req.flash("success", "SubTopic created successfully!");
    if (subTopic) {
      res.status(200).json({
        success: true,
        message: "SubTopic is created successfully!",
        redirectUrl: "/sub-topics",
      });
    }
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong!" });
  }
}

/**
 * edit subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let subTopicSlug = req.params.slug;
    let subTopic = await SubTopic.find({
      slug: subTopicSlug,
      isDeleted: false,
    });
    let activeTopic = await Topic.find({ status: 1, isDeleted: false }).sort({name: 1});
    if (subTopic) {
      return res.render("../views/admin/subTopics/edit", {
        data: subTopic[0],
        allTopic: activeTopic,
        fs: fs,
      });
    }
  } catch (e) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.sub_topic_Id && req.body.sub_topic_Id != "") {
      let subTopic = await SubTopic.findOne({
        _id: req.body.sub_topic_Id,
        isDeleted: false,
      });
      if (subTopic) {
        subTopicData = subTopic;
        let subTopicUpdated = await SubTopic.updateOne(
          { _id: req.body.sub_topic_Id },
          {
            $set: {
              name: req.body.name,
              topic_id: req.body.topic_id,
              note: req.body.note,
              status: req.body.status,
            },
          }
        );
        req.flash("success", "SubTopic updated successfully!");
        res.status(200).json({
          success: true,
          message: "SubTopic is updated successfully!",
          redirectUrl: "/sub-topics",
        });
      } else {
        req.flash("success", "SubTopic not found!");
        res.status(404).json({
          success: false,
          message: "SubTopic not found!",
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
 * update status of a subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      let status = req.body.status == "true" ? "1" : "0";
      await SubTopic.findByIdAndUpdate(req.body.uid, {
        status: status,
      });

      res.status(200).json({
        success: true,
        message: "SubTopic status is updated successfully!",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete subtopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let id = req.params.id;
    let isLearningContentExists = await LearningContent.find({
      sub_topic_id: mysqlOrm.Types.ObjectId(id),
      deleted_at: null
    })
      .limit(1)
      .count();

    if (isLearningContentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/sub-topics",
        message:
          "This subTopic is currently enrolled in a learning content and cannot be deleted at this time.",
      });
    }

    let isTutorTrainingContentExists = await TutorTrainingContent.find({
      sub_topic_id: mysqlOrm.Types.ObjectId(id),
      deleted_at: null
    })
      .limit(1)
      .count();

    if (isTutorTrainingContentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/sub-topics",
        message:
          "This subTopic is currently enrolled in a training content and cannot be deleted at this time.",
      });
    }

    let subTopicUpdates = { isDeleted: true, deleted_at: new Date() };
    let subTopicDeleted = await SubTopic.findOneAndUpdate(
      { _id: id },
      subTopicUpdates,
      {
        new: true,
      }
    );

    if (subTopicDeleted) {
      req.flash("success", "SubTopic is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/sub-topics",
        message: "SubTopic is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/sub-topics",
        message: "SubTopic not found or already deleted.",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      redirectUrl: "/sub-topics",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render subtopics according toTopic.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function renderSubTopics(req, res) {
  try {
    if (req.body.id !== null && req.body.id !== undefined && req.body.id !== '') {
      const topicId = mysqlOrm.Types.ObjectId(req.body.id);
      let subTopics = await SubTopic.find({
        topic_id: topicId,
        isDeleted: false,
        status: 1,
      }).sort({ name: 1 });
      return res.send(subTopics);
    }
    return res.status(400).json({
      message: "Invalid or missing topic ID.",
    });    
  } catch (error) {
    console.log('renderSubTopics error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}