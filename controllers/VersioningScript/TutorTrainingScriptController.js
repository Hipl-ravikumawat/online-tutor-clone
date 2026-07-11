const { v4: uuidv4 } = require("uuid");

const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const TutorTrainingLesson = require("../../models/TutorTrainingLesson");
const TutorTrainingSlide = require("../../models/TutorTrainingSlide");
const TutorTrainingPractice = require("../../models/TutorTrainingPractice");

const TutorTrainingVersionContent = require("../../models/TutorTrainingVersionContent");
const TutorTrainingVersionLesson = require("../../models/TutorTrainingVersionLesson");
const TutorTrainingVersionSlide = require("../../models/TutorTrainingVersionSlide");
const TutorTrainingVersionPractice = require("../../models/TutorTrainingVersionPractice");

const fs = require("fs");
const path = require("path");
const randomStr = require("randomstring");
const globalHelper = require("../../_helper/GlobalHelper");
const TutorAttemptedAssessments = require("../../models/TutorAttemptedAssessments");

module.exports = {
  index,
};

/**
 * assessment index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    await cloneAllAssessments();
    return res.json({ success: true, message: "All assessments cloned" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}


/**
 * Clone all assessments: copy original_content into version collections
 * and update assessment.content with new version IDs
 */
// async function cloneAllAssessments() {
//   try {
//     const assessments = await TutorTrainingAssessment.find({}).lean();

//     for (const assessment of assessments) {
//       let newContent = [];

//       for (const trainingContent of assessment.content) {
//         // clone training content
//         const originalContent = await TutorTrainingContent.findById(
//           trainingContent.training_content_id
//         ).lean();
//         if (!originalContent) continue;

//         const versionContent = await TutorTrainingVersionContent.create({
//           ...originalContent,
//           lesson_ids:[],
//           tutor_training_content_id:originalContent._id,
//           _id: undefined,
//           slug: uuidv4(),
//         });

//         let newLessons = [];
//         let newLessonsIds = [];
        
//         for (const lesson of trainingContent.lessons) {
//           const originalLesson = await TutorTrainingLesson.findById(
//             lesson.lesson_id
//           ).lean();
//           if (!originalLesson) continue;

//           const versionLesson = await TutorTrainingVersionLesson.create({
//             ...originalLesson,
//             slide_ids:[],
//             practice_ids:[],
//             tutor_training_lesson_id:originalLesson._id,
//             _id: undefined,
//             slug: uuidv4(),
//           });

//           let newSlideIds = [];
//           let newPracticeIds = [];

//           // clone slides
//           for (const slideId of lesson.slide_ids) {
//             const originalSlide = await TutorTrainingSlide.findById(slideId).lean();
//             if (!originalSlide) continue;

//             const versionSlide = await TutorTrainingVersionSlide.create({
//               ...originalSlide,
//               tutor_training_slide_id:originalSlide._id,
//               _id: undefined,
//               slug: uuidv4(),
//             });
//             newSlideIds.push(versionSlide._id);
//           }

//           // clone practices
//           for (const practiceId of lesson.practice_ids) {
//             const originalPractice = await TutorTrainingPractice.findById(practiceId).lean();
//             if (!originalPractice) continue;

//             const versionPractice = await TutorTrainingVersionPractice.create({
//               ...originalPractice,
//               tutor_training_practice_id:originalPractice._id,
//               _id: undefined,
//               slug: uuidv4(),
//             });
//             newPracticeIds.push(versionPractice._id);
//           }
//           await TutorTrainingVersionLesson.findByIdAndUpdate(versionLesson._id,{ $set: { slide_ids: newSlideIds, practice_ids:newPracticeIds } },{ new: true });

//           newLessons.push({
//             lesson_id: versionLesson._id,
//             slide_ids: newSlideIds,
//             practice_ids: newPracticeIds,
//           });
//           newLessonsIds.push(versionLesson._id)
//         }
        
//         await TutorTrainingVersionContent.findByIdAndUpdate(versionContent._id,{ $set: { lesson_ids: newLessonsIds } },{ new: true });

//         newContent.push({
//           training_content_id: versionContent._id,
//           lessons: newLessons,
//         });
//       }

//       // update assessment with new versioned content
//       await TutorTrainingAssessment.findByIdAndUpdate(
//         assessment._id,
//         { $set: { content: newContent } },
//         { new: true }
//       );

//       console.log(`Assessment ${assessment._id} cloned successfully`);
//     }

//     console.log("All assessments processed");
//   } catch (err) {
//     console.error("Error cloning assessments:", err);
//   }
// }

async function cloneAllAssessments() {
  try {
    const assessments = await TutorTrainingAssessment.find({}).lean();

    for (const assessment of assessments) {
      let newContent = [];
      
      // Create a mapping object to track old to new IDs for slides and lessons
      const slideIdMapping = {}; // Maps old slide IDs to new versioned slide IDs
      const practiceIdMapping = {}; // Maps old practice IDs to new versioned practice IDs // ######## ADDED: Practice ID mapping
      const lessonIdMapping = {}; // Maps old lesson IDs to new versioned lesson IDs

      for (const trainingContent of assessment.content) {
        // --- Get original content
        const originalContent = await TutorTrainingContent.findById(
          trainingContent.training_content_id
        ).lean();
        if (!originalContent) continue;

        // --- Create new content directory
        const randomString = randomStr.generate({ length: 8, charset: "alphabetic" });
        let newContentDirectory = "lc_" + randomString + Date.now();
        const dir = `./assets/TutorTrainingContent/${newContentDirectory}`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        let oldContentDirectory = originalContent.content_directory;

        // --- Copy thumbnail if exists
        let contentThumbnail = "";
        if (originalContent.thumbnail) {
          let parts = originalContent.thumbnail.split("-");
          parts[0] = Date.now();
          contentThumbnail = parts.join("-");
          globalHelper.copyAnyFile(
            `./assets/TutorTrainingContent/${oldContentDirectory}/${originalContent.thumbnail}`,
            `./assets/TutorTrainingContent/${newContentDirectory}/${contentThumbnail}`
          );
        }

        // --- Create versioned content
        const versionContent = await TutorTrainingVersionContent.create({
          ...originalContent,
          lesson_ids: [],
          tutor_training_content_id: originalContent._id,
          _id: undefined,
          slug: uuidv4(),
          content_directory: newContentDirectory,
          thumbnail: contentThumbnail,
        });

        let newLessons = [];
        let newLessonIds = [];

        // --- Clone Lessons
        for (const lesson of trainingContent.lessons) {
          const originalLesson = await TutorTrainingLesson.findById(lesson.lesson_id).lean();
          if (!originalLesson) continue;

          const versionLesson = await TutorTrainingVersionLesson.create({
            ...originalLesson,
            slide_ids: [],
            practice_ids: [],
            tutor_training_lesson_id: originalLesson._id,
            _id: undefined,
            slug: uuidv4(),
          });

          // Store the mapping between old and new lesson ID
          lessonIdMapping[lesson.lesson_id.toString()] = versionLesson._id;

          let newSlideIds = [];
          let newPracticeIds = [];

          // --- Clone Slides
          for (const slideId of lesson.slide_ids) {
            const originalSlide = await TutorTrainingSlide.findById(slideId).lean();
            if (!originalSlide) continue;

            let newAttachment = "";
            let video = "";

            // handle attachments
            if (originalSlide.attachments?.length > 0 && originalSlide.attachments[0]) {
              let attachmentParts = originalSlide.attachments[0].split("-");
              attachmentParts[0] = Date.now();
              newAttachment = attachmentParts.join("-");
              globalHelper.copyAnyFile(
                `./assets/TutorTrainingContent/${oldContentDirectory}/${originalSlide.attachments[0]}`,
                `./assets/TutorTrainingContent/${newContentDirectory}/${newAttachment}`
              );
            }

            // handle video
            if (originalSlide.video) {
              let videoParts = originalSlide.video.split("-");
              videoParts[0] = Date.now();
              video = videoParts.join("-");
              globalHelper.copyAnyFile(
                `./assets/TutorTrainingContent/${oldContentDirectory}/${originalSlide.video}`,
                `./assets/TutorTrainingContent/${newContentDirectory}/${video}`
              );
            }

            const versionSlide = await TutorTrainingVersionSlide.create({
              ...originalSlide,
              tutor_training_slide_id: originalSlide._id,
              _id: undefined,
              slug: uuidv4(),
              attachments: newAttachment ? [newAttachment] : [],
              video: video,
              content_directory: newContentDirectory,
            });
            
            // Store the mapping between old and new slide ID
            slideIdMapping[slideId.toString()] = versionSlide._id;
            newSlideIds.push(versionSlide._id);
          }

          // --- Clone Practices
          for (const practiceId of lesson.practice_ids) {
            const originalPractice = await TutorTrainingPractice.findById(practiceId).lean();
            if (!originalPractice) continue;

            let question_image = "";
            let question_audio = "";
            let optionObject = [];

            // handle options
            if (Array.isArray(originalPractice.options)) {
              for (let option of originalPractice.options) {
                let option_image = option.option_image;
                if (option.option_image) {
                  let parts = option.option_image.split("-");
                  parts[0] = Date.now();
                  option_image = parts.join("-");
                  globalHelper.copyAnyFile(
                    `./assets/TutorTrainingContent/${oldContentDirectory}/${option.option_image}`,
                    `./assets/TutorTrainingContent/${newContentDirectory}/${option_image}`
                  );
                }
                optionObject.push({
                  option_image,
                  option_text: option.option_text,
                  option_correct: option.option_correct,
                });
              }
            }

            // handle question image
            if (originalPractice.question_image) {
              let parts = originalPractice.question_image.split("-");
              parts[0] = Date.now();
              question_image = parts.join("-");
              globalHelper.copyAnyFile(
                `./assets/TutorTrainingContent/${oldContentDirectory}/${originalPractice.question_image}`,
                `./assets/TutorTrainingContent/${newContentDirectory}/${question_image}`
              );
            }

            // handle question audio
            if (originalPractice.question_audio) {
              let parts = originalPractice.question_audio.split("-");
              parts[0] = Date.now();
              question_audio = parts.join("-");
              globalHelper.copyAnyFile(
                `./assets/TutorTrainingContent/${oldContentDirectory}/${originalPractice.question_audio}`,
                `./assets/TutorTrainingContent/${newContentDirectory}/${question_audio}`
              );
            }

            const versionPractice = await TutorTrainingVersionPractice.create({
              ...originalPractice,
              tutor_training_practice_id: originalPractice._id,
              _id: undefined,
              slug: uuidv4(),
              content_directory: newContentDirectory,
              question_image,
              question_audio,
              options: optionObject,
            });
            
            // ######## ADDED: Store the mapping between old and new practice ID
            practiceIdMapping[practiceId.toString()] = versionPractice._id;
            newPracticeIds.push(versionPractice._id);
          }

          await TutorTrainingVersionLesson.findByIdAndUpdate(
            versionLesson._id,
            { $set: { slide_ids: newSlideIds, practice_ids: newPracticeIds } },
            { new: true }
          );

          newLessons.push({
            lesson_id: versionLesson._id,
            slide_ids: newSlideIds,
            practice_ids: newPracticeIds,
          });
          newLessonIds.push(versionLesson._id);
        }

        // --- Update version content with new lessons
        await TutorTrainingVersionContent.findByIdAndUpdate(
          versionContent._id,
          { $set: { lesson_ids: newLessonIds } },
          { new: true }
        );

        newContent.push({
          training_content_id: versionContent._id,
          lessons: newLessons,
        });
      }

      // --- NEW: Also process original_content to map those lessons
      // This is crucial because tutor_attempted_assessments might reference lessons from original_content
      if (assessment.original_content && assessment.original_content.length > 0) {
        for (const originalContentItem of assessment.original_content) {
          for (const lesson of originalContentItem.lessons) {
            // Check if we already have this lesson mapped from content array
            if (!lessonIdMapping[lesson.lesson_id.toString()]) {
              // If not, we need to create a versioned lesson for this original lesson
              const originalLesson = await TutorTrainingLesson.findById(lesson.lesson_id).lean();
              if (!originalLesson) continue;

              const versionLesson = await TutorTrainingVersionLesson.create({
                ...originalLesson,
                slide_ids: [],
                practice_ids: [],
                tutor_training_lesson_id: originalLesson._id,
                _id: undefined,
                slug: uuidv4(),
              });

              // Store the mapping for this original lesson
              lessonIdMapping[lesson.lesson_id.toString()] = versionLesson._id;

              // Also map the slides from this original lesson
              for (const slideId of lesson.slide_ids) {
                if (!slideIdMapping[slideId.toString()]) {
                  const originalSlide = await TutorTrainingSlide.findById(slideId).lean();
                  if (!originalSlide) continue;

                  // For original_content slides, we need to handle file copying if needed
                  // You might need to adjust the directory logic here based on your needs
                  let newAttachment = "";
                  let video = "";

                  // handle attachments
                  if (originalSlide.attachments?.length > 0 && originalSlide.attachments[0]) {
                    let attachmentParts = originalSlide.attachments[0].split("-");
                    attachmentParts[0] = Date.now();
                    newAttachment = attachmentParts.join("-");
                    // You might need different directory logic for original_content files
                    globalHelper.copyAnyFile(
                      `./assets/TutorTrainingContent/${oldContentDirectory}/${originalSlide.attachments[0]}`,
                      `./assets/TutorTrainingContent/${newContentDirectory}/${newAttachment}`
                    );
                  }

                  // handle video
                  if (originalSlide.video) {
                    let videoParts = originalSlide.video.split("-");
                    videoParts[0] = Date.now();
                    video = videoParts.join("-");
                    globalHelper.copyAnyFile(
                      `./assets/TutorTrainingContent/${oldContentDirectory}/${originalSlide.video}`,
                      `./assets/TutorTrainingContent/${newContentDirectory}/${video}`
                    );
                  }

                  const versionSlide = await TutorTrainingVersionSlide.create({
                    ...originalSlide,
                    tutor_training_slide_id: originalSlide._id,
                    _id: undefined,
                    slug: uuidv4(),
                    attachments: newAttachment ? [newAttachment] : [],
                    video: video,
                    content_directory: newContentDirectory, // Use the same directory
                  });
                  
                  slideIdMapping[slideId.toString()] = versionSlide._id;
                }
              }

              // ######## ADDED: Also map the practices from this original lesson
              for (const practiceId of lesson.practice_ids) {
                if (!practiceIdMapping[practiceId.toString()]) {
                  const originalPractice = await TutorTrainingPractice.findById(practiceId).lean();
                  if (!originalPractice) continue;

                  let question_image = "";
                  let question_audio = "";
                  let optionObject = [];

                  // handle options
                  if (Array.isArray(originalPractice.options)) {
                    for (let option of originalPractice.options) {
                      let option_image = option.option_image;
                      if (option.option_image) {
                        let parts = option.option_image.split("-");
                        parts[0] = Date.now();
                        option_image = parts.join("-");
                        globalHelper.copyAnyFile(
                          `./assets/TutorTrainingContent/${oldContentDirectory}/${option.option_image}`,
                          `./assets/TutorTrainingContent/${newContentDirectory}/${option_image}`
                        );
                      }
                      optionObject.push({
                        option_image,
                        option_text: option.option_text,
                        option_correct: option.option_correct,
                      });
                    }
                  }

                  // handle question image
                  if (originalPractice.question_image) {
                    let parts = originalPractice.question_image.split("-");
                    parts[0] = Date.now();
                    question_image = parts.join("-");
                    globalHelper.copyAnyFile(
                      `./assets/TutorTrainingContent/${oldContentDirectory}/${originalPractice.question_image}`,
                      `./assets/TutorTrainingContent/${newContentDirectory}/${question_image}`
                    );
                  }

                  // handle question audio
                  if (originalPractice.question_audio) {
                    let parts = originalPractice.question_audio.split("-");
                    parts[0] = Date.now();
                    question_audio = parts.join("-");
                    globalHelper.copyAnyFile(
                      `./assets/TutorTrainingContent/${oldContentDirectory}/${originalPractice.question_audio}`,
                      `./assets/TutorTrainingContent/${newContentDirectory}/${question_audio}`
                    );
                  }

                  const versionPractice = await TutorTrainingVersionPractice.create({
                    ...originalPractice,
                    tutor_training_practice_id: originalPractice._id,
                    _id: undefined,
                    slug: uuidv4(),
                    content_directory: newContentDirectory,
                    question_image,
                    question_audio,
                    options: optionObject,
                  });
                  
                  practiceIdMapping[practiceId.toString()] = versionPractice._id;
                                    

                }
              }
            }
          }
        }
      }

      // --- Update assessment with new versioned content
      await TutorTrainingAssessment.findByIdAndUpdate(
        assessment._id,
        { $set: { content: newContent } },
        { new: true }
      );

      // --- NEW: Update tutor_attempted_assessments with new slide IDs and lesson IDs
      // Find all attempted assessments for this assessment
      const attemptedAssessments = await TutorAttemptedAssessments.find({
        assessment_id: assessment._id
      }).lean();

      let updatedAttemptedCount = 0;

      for (const attemptedAssessment of attemptedAssessments) {
        let updatedAnswers = [];
        
        // ######## UPDATED: Update the answers array based on assessment_type
        if (Array.isArray(attemptedAssessment.answers)) {
          for (const answer of attemptedAssessment.answers) {
            let updatedAnswer = { ...answer };
            
            // Handle different assessment types
            if (attemptedAssessment.assessment_type === 'slides' || attemptedAssessment.assessment_type === 'slide') {
              // For slide assessments, update slide IDs in answers
              if (answer.id && slideIdMapping[answer.id.toString()]) {
                updatedAnswer.id = slideIdMapping[answer.id.toString()];
              }
            } else if (attemptedAssessment.assessment_type === 'practices' || attemptedAssessment.assessment_type === 'practice') {
              // For practice assessments, update practice IDs in answers
              if (answer.questionId && practiceIdMapping[answer.questionId.toString()]) {
                updatedAnswer.questionId = practiceIdMapping[answer.questionId.toString()];
              }
            } else {
              // For mixed or unknown assessment types, try both mappings
              if (answer.id && slideIdMapping[answer.id.toString()]) {
                updatedAnswer.id = slideIdMapping[answer.id.toString()];
              } else if (answer.questionId && practiceIdMapping[answer.questionId.toString()]) {
                updatedAnswer.questionId = practiceIdMapping[answer.questionId.toString()];
              }
            }
            updatedAnswers.push(updatedAnswer);
          }
        }

        // Update lesson_id if mapping exists
        let updatedLessonId = attemptedAssessment.lesson_id;
        if (attemptedAssessment.lesson_id && lessonIdMapping[attemptedAssessment.lesson_id.toString()]) {
          updatedLessonId = lessonIdMapping[attemptedAssessment.lesson_id.toString()];
        }

        // Only update if there are changes
        const answersChanged = JSON.stringify(attemptedAssessment.answers) !== JSON.stringify(updatedAnswers);
        const lessonIdChanged = updatedLessonId.toString() !== attemptedAssessment.lesson_id.toString();
        
        if (answersChanged || lessonIdChanged) {
          await TutorAttemptedAssessments.findByIdAndUpdate(
            attemptedAssessment._id,
            { 
              $set: { 
                answers: updatedAnswers,
                lesson_id: updatedLessonId
              } 
            },
            { new: true }
          );
          updatedAttemptedCount++;
        }
      }

      console.log(`Assessment ${assessment._id} cloned with assets successfully`);
      console.log(`Updated ${updatedAttemptedCount} attempted assessments`);
    }

    console.log("All assessments cloned with assets");
  } catch (err) {
    console.error("Error cloning assessments with assets:", err);
  }
}



