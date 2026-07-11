const EventCourse = require("../../models/EventCourse");
const mysqlOrm = require('mysql-orm');
const moment = require('moment-timezone');


module.exports = {
    coursesDataTable,
    markCompleted,
    courseDetails,
    courseDetailsListing,
};

/**
 * event courses dataTable.
 * @param {*} req
 * @param {*} res
 * @returns
 */
let timeZone;
async function coursesDataTable(req, res) {
    try {
        let searchStr = req.body.search.value;
        let obj = {};
        if (req.body.eventId) {
          obj["event_ids"] =  { $in: [req.body.eventId] };
        }
    
        const user_detail = res.locals.loggedUserInfo;
        timeZone = user_detail?.time_zone;
        if (req.body.search.value) {
          let  regex = new RegExp(req.body.search.value, "i")
          searchStr =  { title: regex };
        }
        else {
            searchStr = {};
        }
        const userRole = user_detail.role;
        const userId = user_detail._id.toString();
        
        countCourse = {};
        const filter = ['name'];
        let sort = {};
        
        if (req.body.order == undefined) {
            sort = { "_id": -1 };
        } else {
            const column_name = filter[req.body.order[0].column];
            const order_by = req.body.order[0].dir;
            sort = { [column_name]: order_by };
        }
    
        let  recordsTotal = 0;
        let  recordsFiltered = 0;  
        recordsTotal = await EventCourse.count(countCourse);
        recordsFiltered = await EventCourse.count({ $and: [obj,] });
        let results = await EventCourse.find(
          { $and: [obj, { "content.lesson_id": { $ne: null } }] },
          "_id event_ids content status slug",
          { skip: Number(req.body.start) || 0, limit: Number(req.body.length) || 10 }
        )
        .populate([{
          path: 'content.learning_content_id',
          model: 'learning_content_versions'
        }])
        .populate([{
          path: 'content.lesson_id',
          model: 'lesson_versions'
        }])
        .sort(sort);
      if (!results || results.length === 0) {
        return res.send({
          draw: req.body.draw,
          recordsFiltered: 0,
          recordsTotal: recordsTotal,
          data: [],
          userRole: userRole,
        });
      }

      // flatten & filter
      let allContent = results.flatMap(r => r.content);
      let filteredData = allContent.filter(item => item.lesson_id !== null);

        if (req.body.search && req.body.search.value) {
            const regex = new RegExp(req.body.search.value, "i");
            filteredData = filteredData.filter(item =>
              item.lesson_id?.title && regex.test(item.lesson_id.title)
            );
        }
      recordsTotal = allContent.length;
      recordsFiltered = filteredData.length;

      return res.send({
        draw: req.body.draw,
        recordsFiltered,
        recordsTotal,
        data: filteredData,
        userRole: userRole,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * mark slide as read.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function markCompleted(req, res) {
    try{
      const eventId = req.body.eventId;
      const lessonId = req.body.lessonId;
      const slideId = req.body.slideId;
      const isChecked = req.body.isChecked;
  
      const eventCourse = await EventCourse.find({event_ids: mysqlOrm.Types.ObjectId(eventId)},{ content: 1, status: 1 });
  
      const targetLessonId = mysqlOrm.Types.ObjectId(lessonId);
      let courseContent = eventCourse[0].content;
      const filteredLesson = courseContent.find(lesson => lesson.lesson_id.equals(targetLessonId));
      const slides = filteredLesson.slides;
      for(let slide of slides){
        if(slide.slide_id.toString() === slideId){
          const now = new Date();
          const formattedDateTime = now.toISOString();
          slide.slide_id = slideId
          slide.mark_as_read = isChecked === 'true';
          slide.mark_at = formattedDateTime;
          slide.attached_event_id = eventId;
        }
      }
      const countCompletedSlides = slides.reduce((acc, item) => (item.mark_as_read ? acc + 1 : acc), 0);
      const totalSlides = slides.length;
      let slideScore = (countCompletedSlides/totalSlides) *100;
      if(Number.isInteger(slideScore) == false) {
        slideScore = slideScore.toFixed(2);
      }
      if(slideScore === 100){
        filteredLesson.status= 'Completed';
      }else if(slideScore > 0){
        filteredLesson.status= 'Processing';
      }else{
        filteredLesson.status= 'N/A';
      }
      filteredLesson.slide_score = slideScore;
      for(let courses of courseContent){
        if(courses.lesson_id.toString() === lessonId){
          courses = filteredLesson;
          break;
        }
      }
      
      const countCompletedLesson = courseContent.reduce((acc, item) => {
        const score = parseFloat(item.slide_score);
              return acc + score;
      }, 0);
  
      const totalCourseLesson = courseContent.length;
      let percentage = (countCompletedLesson/totalCourseLesson);
      if(Number.isInteger(percentage) == false) {
        percentage = percentage.toFixed(2);
      }
  
      const eventCourseUpdate = await EventCourse.updateOne({event_ids: mysqlOrm.Types.ObjectId(eventId)},{ content: eventCourse[0].content,percentage:percentage});
      let message = isChecked == "true" ? "This slide is marked as completed successfully!" : "This slide is marked uncompleted successfully!"
      req.flash("success", message);
      res
      .status(200)
      .json({
        success: true,
        message: message,
      });
    }catch(error){
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * course detail.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function courseDetails(req, res) {
  try{
    const {eventId, lessonId} = req.params; 
    return res.render("../views/admin/calendar/course_detail", {eventId:eventId});
  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * course detail.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function courseDetailsListing(req, res) {
  try{
    const moment = res.locals.moment;
    const {eventId, lessonId, currentPage, slidePerPage,search:{startDate,endDate},search} = req.body; 
    const page = parseInt(currentPage) || 1; // Get page number from query params, default to 1
    const slidesPerPage = parseInt(slidePerPage) || 5; 

    const eventLesson = await EventCourse.aggregate([
      { $match: { event_ids: mysqlOrm.Types.ObjectId(eventId) } },
      {
        $project: {
          _id: 1,
          event_ids: 1,
          percentage: 1,
          isDeleted: 1,
          deleted_at: 1,
          created_at: 1,
          updated_at: 1,
          content: {
            $filter: {
              input: '$content',
              as: 'content',
              cond: { $eq: ['$$content.lesson_id', mysqlOrm.Types.ObjectId(lessonId)] }
            }
          }
        }
      }
    ]);


    // Populate the slides in the filtered results
    const populatedEventLesson = await EventCourse.populate(eventLesson, [{
      path: 'content.slides.slide_id',
      model: 'slides_versions',
      select:'title slide_score'
    }, {
      path: 'content.lesson_id',
      model: 'lessons',
      select:'title'
    },
    {
      path: 'content.slides.attached_event_id',
      model: 'events',
      select:'tutor_id substitute_tutor_id is_substitute_tutor',
      populate: [
        {
        path: "tutor_id",
        model: "users",
        select:'first_name last_name',
      },
      {
        path: "substitute_tutor_id",
        model: "users",
        select:'first_name last_name',
      }
    ]
    }]);
    let content = eventLesson[0].content[0];

    let slidesData = content.slides;
    if (search !== '') {    
      // Convert to ISO 8601 format
      const start = moment(new Date(startDate).toISOString());
      const end = moment(new Date(endDate).toISOString());
    
      // Ensure valid Moment.js objects
      if (!start.isValid() || !end.isValid()) {
        throw new Error("Invalid date range provided.");
      }
    
      const filteredSlides = slidesData.filter(slide => {
        if (slide.mark_at) {
          const markAt = moment(slide.mark_at);
          return markAt.isValid() && markAt.isBetween(start, end, undefined, '[]');
        }
        return false;
      });
    
      slidesData = filteredSlides;
    }
    
    // Paginate slides
    const totalSlides = slidesData.length;
    const slideScore = content.slide_score;

    const totalPages = Math.ceil(totalSlides / slidesPerPage);
    const start = (page - 1) * slidesPerPage;
    const end = start + slidesPerPage;
    const paginatedSlides = slidesData.slice(start, end);
    let html = '';
    if(paginatedSlides.length > 0){
      for(let slide of paginatedSlides){
        let tutorName = 'N/A';
        if(slide.attached_event_id !==null){
          if(slide.attached_event_id.is_substitute_tutor){
            tutorName = `${slide.attached_event_id?.substitute_tutor_id.first_name+ ' ' + slide.attached_event_id.substitute_tutor_id.last_name}`;
          }else{
            tutorName = `${slide.attached_event_id?.tutor_id.first_name+ ' ' + slide.attached_event_id.tutor_id.last_name}`;
          }
        }
        html += `<li class="slide_list"><h3 class="title-text">${slide?.slide_id?.title}</h3><div class="slide_inner_list"><div class="slide_inner_col"><p>Date/Time</p><span>${
        slide.mark_at !== null 
          ? moment(slide.mark_at).tz(timeZone || "UTC").format('MMM DD, YYYY hh:mm:ss A') 
          : 'N/A'
      }</span></div><div class="slide_inner_col"><p>Tutor</p><span class="primary complete_btn">${tutorName}</span></div><div class="slide_inner_col"><p>Status</p>${slide.mark_as_read ?  `<span class="complete_btn">Read</span>` : `<span class="cancel_btn">UnRead</span>`}</div></div></li>`;
      }
    }else{
      html = '<p>No record found</p>'
    }

    var data = JSON.stringify({
      html: html,
      totalNoOfPages: totalPages,
      currentPage: page,
      recordsTotal:totalSlides,
      slidesPerPage: slidesPerPage,
      totalSlides:totalSlides,
      slideScore:slideScore,
      lessonName: content?.lesson_id?.title,
    });
    return res.send(data);
  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}